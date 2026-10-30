# Kuramoto Sync Lab

An interactive visualizer for the **Kuramoto model** — the classic mathematical model
of spontaneous synchronization. Hundreds of phase oscillators, each with its own
natural frequency, couple to their neighbors and (above a critical coupling strength)
spontaneously lock into a common rhythm — the same physics behind fireflies flashing
in unison, synchronized cardiac pacemaker cells, and power-grid frequency locking.

## Features

- **Order parameter r** live readout + scrolling r(t) chart — watch the phase
  transition from incoherence (r≈0) to synchrony (r≈1) as you raise K.
- **4 coupling topologies**: global (all-to-all), ring, small-world
  (Watts–Strogatz-style rewired ring), and 2D grid.
- **3 natural-frequency distributions**: Gaussian, uniform, bimodal.
- Sliders for coupling K, noise σ, speed, population size N, and frequency spread γ.
- **Desync kick** button to knock the system out of sync and watch it re-lock.
- **Sweep K** button: runs an automated scan of steady-state r̄ over K ∈ [0, 4],
  plots the r̄(K) curve, and marks the empirically measured critical coupling Kc
  with a dashed line — watch the phase transition emerge from the data.
- Mean-field arrow, per-oscillator hue mapped to natural frequency, PNG export.

## How to run

No dependencies, no build step, no network. Just open `index.html` in any browser:

```
open index.html          # macOS
xdg-open index.html      # Linux
```

## The model

Each oscillator i has a phase θᵢ evolving as:

```
dθᵢ/dt = ωᵢ + (K/zᵢ) Σⱼ Aᵢⱼ sin(θⱼ − θᵢ) + σ ξᵢ(t)
```

where ωᵢ is drawn from the chosen distribution, A is the adjacency matrix implied by
the topology, and ξ is Gaussian white noise. Integration is explicit Euler.

Try: set γ small and slowly raise K — the jump in r marks the critical coupling
K_c ≈ 2/(π·g(0)).
