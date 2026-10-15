import { useCallback, useMemo, useRef, useState } from 'react'
import { invertMove, isRotation, type Move } from '../cube/moves'
import { SOLVED, type CubeState } from '../cube/state'
import { tileShown } from '../solver/method'
import type { Segment } from '../solver/solver'
import type { CubeView } from '../three/CubeView'
import { buildTimeline, segmentAt, segmentEnd, stageAt, stageRange, type Timeline } from './timeline'

/** Milliseconds for a quarter turn at each speed setting (1 = slowest). */
export const SPEED_MS = [1200, 800, 520, 320, 170] as const

function useSynced<T>(initial: T) {
  const [value, setValue] = useState(initial)
  const ref = useRef(initial)
  const set = useCallback((v: T) => {
    ref.current = v
    setValue(v)
  }, [])
  return [value, set, ref] as const
}

export type Player = ReturnType<typeof usePlayer>

/**
 * Drives a CubeView through a solution timeline (play, pause, step, seek). With no timeline
 * loaded it shows a solved cube. Refs hold the live values so the async animation loop never
 * reads stale state; React state mirrors them for rendering.
 */
export function usePlayer(initial: Timeline | null = null) {
  const viewRef = useRef<CubeView | null>(null)
  const tokenRef = useRef(0)
  const [timeline, setTimeline, timelineRef] = useSynced<Timeline | null>(initial)
  const [pos, setPos, posRef] = useSynced(0)
  const [playing, setPlaying, playingRef] = useSynced(false)
  const [speed, setSpeedState, speedRef] = useSynced(3)
  const [pauseAtSteps, setPauseAtSteps, pauseAtStepsRef] = useSynced(true)
  const [labels, setLabelsState, labelsRef] = useSynced(false)
  const [flipped, setFlippedState, flippedRef] = useSynced(false)

  const currentState = useCallback(
    (): CubeState => (timelineRef.current ? timelineRef.current.states[posRef.current] : SOLVED),
    [timelineRef, posRef],
  )

  const duration = useCallback(
    (m: Move) => {
      const base = SPEED_MS[speedRef.current - 1]
      return m.amount === 2 ? base * 1.45 : isRotation(m) ? base * 1.15 : base
    },
    [speedRef],
  )

  /** Gray out the pieces the step at `p` doesn't care about yet. */
  const grayAt = useCallback(
    (p: number) => {
      const t = timelineRef.current
      const view = viewRef.current
      if (!view) return
      const stage = t ? stageAt(t, p) : 0
      view.setFilter(stage >= 1 && stage <= 8 ? (piece, tile) => tileShown(stage, piece, tile) : null)
    },
    [timelineRef],
  )

  const attach = useCallback(
    (view: CubeView | null) => {
      viewRef.current = view
      if (!view) {
        // The canvas went away (e.g. page switch): stop any running playback.
        tokenRef.current++
        setPlaying(false)
        return
      }
      view.setState(currentState())
      view.setLabels(labelsRef.current)
      view.setFlipped(flippedRef.current, false)
      grayAt(posRef.current)
    },
    [currentState, grayAt, labelsRef, flippedRef, posRef, setPlaying],
  )

  const stop = useCallback(() => {
    tokenRef.current++
    setPlaying(false)
  }, [setPlaying])

  const seek = useCallback(
    (p: number) => {
      const t = timelineRef.current
      if (!t) return
      const target = Math.max(0, Math.min(t.moves.length, p))
      stop()
      setPos(target)
      viewRef.current?.setState(t.states[target])
      grayAt(target)
    },
    [timelineRef, stop, setPos, grayAt],
  )

  /** Animate forward until `stopAt` (exclusive end position) or until paused. */
  const playUntil = useCallback(
    async (stopAt: number) => {
      const t = timelineRef.current
      const view = viewRef.current
      if (!t || !view || playingRef.current || view.isBusy()) return
      if (posRef.current >= t.moves.length) seek(0)
      const token = ++tokenRef.current
      setPlaying(true)
      const end = Math.min(stopAt, t.moves.length)
      while (playingRef.current && tokenRef.current === token && posRef.current < end) {
        const i = posRef.current
        grayAt(i)
        await view.animate(t.moves[i].move, duration(t.moves[i].move))
        if (tokenRef.current !== token) return
        setPos(i + 1)
        if (pauseAtStepsRef.current && stopAt >= t.moves.length && i + 1 < t.moves.length && stageAt(t, i + 1) !== stageAt(t, i)) break
      }
      if (tokenRef.current === token) {
        setPlaying(false)
        grayAt(posRef.current)
      }
    },
    [timelineRef, playingRef, posRef, seek, setPlaying, grayAt, duration, setPos, pauseAtStepsRef],
  )

  const play = useCallback(() => playUntil(Number.POSITIVE_INFINITY), [playUntil])

  // Lets the current turn finish; the play loop sees the flag and exits afterwards.
  const pause = useCallback(() => setPlaying(false), [setPlaying])

  const toggle = useCallback(() => (playingRef.current ? pause() : play()), [playingRef, pause, play])

  const stepForward = useCallback(async () => {
    const t = timelineRef.current
    const view = viewRef.current
    if (!t || !view) return
    if (playingRef.current) return pause()
    if (view.isBusy() || posRef.current >= t.moves.length) return
    const i = posRef.current
    const token = ++tokenRef.current
    grayAt(i)
    await view.animate(t.moves[i].move, duration(t.moves[i].move))
    if (tokenRef.current !== token) return
    setPos(i + 1)
    grayAt(i + 1)
  }, [timelineRef, playingRef, pause, posRef, grayAt, duration, setPos])

  const stepBack = useCallback(async () => {
    const t = timelineRef.current
    const view = viewRef.current
    if (!t || !view) return
    if (playingRef.current) return pause()
    if (view.isBusy() || posRef.current <= 0) return
    const i = posRef.current - 1
    const token = ++tokenRef.current
    grayAt(i)
    const inverse = invertMove(t.moves[i].move)
    await view.animate(inverse, duration(inverse))
    if (tokenRef.current !== token) return
    setPos(i)
    grayAt(i)
  }, [timelineRef, playingRef, pause, posRef, grayAt, duration, setPos])

  /** Play the rest of the current segment. */
  const nextSegment = useCallback(() => {
    const t = timelineRef.current
    if (!t || posRef.current >= t.moves.length) return
    if (playingRef.current) return pause()
    return playUntil(segmentEnd(t, segmentAt(t, posRef.current)))
  }, [timelineRef, posRef, playingRef, pause, playUntil])

  /** Jump to the start of the current segment, or the previous one if already there. */
  const prevSegment = useCallback(() => {
    const t = timelineRef.current
    if (!t) return
    const p = posRef.current
    let seg = segmentAt(t, Math.max(0, p - 1))
    if (t.segStart[seg] === p && seg > 0) seg--
    seek(t.segStart[seg] ?? 0)
  }, [timelineRef, posRef, seek])

  const seekStage = useCallback(
    (stage: number) => {
      const t = timelineRef.current
      if (!t) return
      const range = stageRange(t, stage)
      if (range) return seek(range[0])
      // Stage had nothing to do: jump to the next stage that did.
      for (let s = stage + 1; s <= 8; s++) {
        const r = stageRange(t, s)
        if (r) return seek(r[0])
      }
      seek(t.moves.length)
    },
    [timelineRef, seek],
  )

  const nextStage = useCallback(() => {
    const t = timelineRef.current
    if (!t) return
    const stage = stageAt(t, posRef.current)
    if (stage > 8) return
    const range = stageRange(t, stage)
    seek(range ? range[1] : t.moves.length)
  }, [timelineRef, posRef, seek])

  const prevStage = useCallback(() => {
    const t = timelineRef.current
    if (!t) return
    const p = posRef.current
    const stage = stageAt(t, Math.max(0, p - 1))
    const range = stageRange(t, stage)
    if (range && range[0] < p) return seek(range[0])
    for (let s = stage - 1; s >= 1; s--) {
      const r = stageRange(t, s)
      if (r) return seek(r[0])
    }
    seek(0)
  }, [timelineRef, posRef, seek])

  /** Load a solution and show its starting position. */
  const load = useCallback(
    (start: CubeState, segments: Segment[]) => {
      stop()
      const t = buildTimeline(start, segments)
      setTimeline(t)
      setPos(0)
      viewRef.current?.setState(start)
      grayAt(0)
    },
    [stop, setTimeline, setPos, grayAt],
  )

  const setSpeed = useCallback((v: number) => setSpeedState(Math.max(1, Math.min(SPEED_MS.length, v))), [setSpeedState])

  const setLabels = useCallback(
    (v: boolean) => {
      setLabelsState(v)
      viewRef.current?.setLabels(v)
    },
    [setLabelsState],
  )

  const setFlipped = useCallback(
    (v: boolean) => {
      setFlippedState(v)
      viewRef.current?.setFlipped(v)
    },
    [setFlippedState],
  )

  const resetCamera = useCallback(() => viewRef.current?.resetCamera(), [])

  const state = timeline ? timeline.states[pos] : SOLVED

  return useMemo(
    () => ({
      attach,
      timeline,
      pos,
      playing,
      state,
      speed,
      pauseAtSteps,
      labels,
      flipped,
      currentState,
      load,
      play,
      pause,
      toggle,
      stepForward,
      stepBack,
      nextSegment,
      prevSegment,
      nextStage,
      prevStage,
      seek,
      seekStage,
      setSpeed,
      setPauseAtSteps,
      setLabels,
      setFlipped,
      resetCamera,
    }),
    [
      attach, timeline, pos, playing, state, speed, pauseAtSteps, labels, flipped, currentState, load, play, pause, toggle, stepForward, stepBack,
      nextSegment, prevSegment, nextStage, prevStage, seek, seekStage, setSpeed, setPauseAtSteps, setLabels, setFlipped, resetCamera,
    ],
  )
}
