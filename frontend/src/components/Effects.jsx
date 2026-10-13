import { useEffect, useRef, useState, useCallback } from 'react'

// ── Particle / Confetti system ───────────────────────────────────────────────
const CONFETTI_COLORS = ['#6C63FF','#FF5E7A','#10D98A','#FFAA3B','#38BDF8','#F472B6','#FFD93D','#A78BFA']

function randomBetween(a, b) { return a + Math.random() * (b - a) }

class Particle {
  constructor(canvas, type = 'confetti') {
    this.canvas = canvas
    this.type = type
    this.reset()
  }
  reset(x, y) {
    this.x = x ?? randomBetween(0, this.canvas.width)
    this.y = y ?? -20
    this.vx = randomBetween(-6, 6)
    this.vy = randomBetween(2, 8)
    this.rotation = randomBetween(0, 360)
    this.rotationSpeed = randomBetween(-8, 8)
    this.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    this.size = randomBetween(6, 14)
    this.shape = ['rect', 'circle', 'star'][Math.floor(Math.random() * 3)]
    this.alpha = 1
    this.gravity = 0.15
    this.life = 1
    this.decay = randomBetween(0.008, 0.015)
  }
  update() {
    this.x += this.vx
    this.vy += this.gravity
    this.y += this.vy
    this.rotation += this.rotationSpeed
    this.life -= this.decay
    this.alpha = this.life
    this.vx *= 0.99
  }
  draw(ctx) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, this.alpha)
    ctx.translate(this.x, this.y)
    ctx.rotate((this.rotation * Math.PI) / 180)
    ctx.fillStyle = this.color
    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2)
    } else if (this.shape === 'circle') {
      ctx.beginPath(); ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2); ctx.fill()
    } else {
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? this.size / 2 : this.size / 4
        i === 0 ? ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r) : ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
      }
      ctx.closePath(); ctx.fill()
    }
    ctx.restore()
  }
  isDead() { return this.life <= 0 || this.y > this.canvas.height + 20 }
}

// Burst particle from a point
class BurstParticle extends Particle {
  reset(x, y) {
    this.x = x ?? this.canvas.width / 2
    this.y = y ?? this.canvas.height / 2
    const angle = randomBetween(0, Math.PI * 2)
    const speed = randomBetween(4, 14)
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed - randomBetween(2, 6)
    this.rotation = randomBetween(0, 360)
    this.rotationSpeed = randomBetween(-12, 12)
    this.color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    this.size = randomBetween(8, 16)
    this.shape = ['rect', 'circle', 'star'][Math.floor(Math.random() * 3)]
    this.alpha = 1
    this.gravity = 0.3
    this.life = 1
    this.decay = randomBetween(0.012, 0.02)
  }
}

export function ConfettiCanvas({ active, onDone }) {
  const canvasRef = useRef(null)
  const particlesRef = useRef([])
  const animRef = useRef(null)
  const spawnedRef = useRef(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')
    particlesRef.current = []
    spawnedRef.current = 0

    let frame = 0
    const totalFrames = 120
    const spawnPerFrame = 8

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Spawn confetti from top
      if (frame < totalFrames) {
        for (let i = 0; i < spawnPerFrame; i++) {
          particlesRef.current.push(new Particle(canvas))
        }
        frame++
      }

      particlesRef.current = particlesRef.current.filter(p => !p.isDead())
      particlesRef.current.forEach(p => { p.update(); p.draw(ctx) })

      if (frame >= totalFrames && particlesRef.current.length === 0) {
        cancelAnimationFrame(animRef.current)
        onDone?.()
        return
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [active])

  if (!active) return null
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[999]"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}

export function BlastCanvas({ trigger, x, y, onDone }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    if (!trigger) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')
    const cx = x ?? canvas.width / 2
    const cy = y ?? canvas.height / 2

    const particles = Array.from({ length: 60 }, () => {
      const p = new BurstParticle(canvas)
      p.reset(cx, cy)
      return p
    })

    // Shockwave ring
    let ringRadius = 0
    let ringAlpha = 1

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw shockwave
      if (ringRadius < 120) {
        ctx.save()
        ctx.strokeStyle = `rgba(108,99,255,${ringAlpha})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
        ringRadius += 5
        ringAlpha -= 0.02
      }

      const alive = particles.filter(p => !p.isDead())
      alive.forEach(p => { p.update(); p.draw(ctx) })

      if (alive.length === 0 && ringRadius >= 120) {
        cancelAnimationFrame(animRef.current)
        onDone?.()
        return
      }
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [trigger, x, y])

  if (!trigger) return null
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[998]"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}

// ── Sound effects via Web Audio API ──────────────────────────────────────────
class SoundEngine {
  constructor() {
    this._ctx = null
  }
  get ctx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)()
    return this._ctx
  }
  resume() { if (this.ctx.state === 'suspended') this.ctx.resume() }

  _play(freq, type, duration, vol = 0.3, delay = 0) {
    try {
      this.resume()
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.connect(gain); gain.connect(this.ctx.destination)
      osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay)
      gain.gain.setValueAtTime(vol, this.ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration)
      osc.start(this.ctx.currentTime + delay)
      osc.stop(this.ctx.currentTime + delay + duration)
    } catch (e) {}
  }

  coin() {
    this._play(880, 'sine', 0.15, 0.25)
    this._play(1320, 'sine', 0.15, 0.2, 0.08)
  }

  party() {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => this._play(n, 'sine', 0.3, 0.3, i * 0.1))
  }

  warning() {
    this._play(220, 'sawtooth', 0.2, 0.15)
    this._play(196, 'sawtooth', 0.2, 0.15, 0.15)
  }

  pop() {
    this._play(600, 'sine', 0.08, 0.2)
    this._play(800, 'sine', 0.06, 0.06, 0.05)
  }

  whoosh() {
    try {
      this.resume()
      const bufSize = this.ctx.sampleRate * 0.15
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize)
      const src = this.ctx.createBufferSource()
      const gain = this.ctx.createGain()
      const filter = this.ctx.createBiquadFilter()
      filter.type = 'bandpass'; filter.frequency.value = 1000; filter.Q.value = 0.5
      src.buffer = buf; src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination)
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15)
      src.start(); src.stop(this.ctx.currentTime + 0.15)
    } catch (e) {}
  }

  delete() {
    this._play(300, 'sine', 0.1, 0.2)
    this._play(200, 'sine', 0.15, 0.2, 0.08)
  }
}

export const sound = new SoundEngine()

// ── Party Popup ───────────────────────────────────────────────────────────────
export function PartyPopup({ show, onDone }) {
  useEffect(() => {
    if (show) {
      sound.party()
      const t = setTimeout(onDone, 4000)
      return () => clearTimeout(t)
    }
  }, [show])

  if (!show) return null
  return (
    <div className="fixed inset-0 z-[990] flex items-center justify-center pointer-events-none">
      <div
        className="text-center"
        style={{ animation: 'partyPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        <div className="text-8xl mb-4" style={{ animation: 'spin 1s linear infinite' }}>🎉</div>
        <div className="text-4xl font-bold text-white mb-2" style={{ textShadow: '0 0 30px #6C63FF' }}>
          Great Savings!
        </div>
        <div className="text-xl text-emerald-400">You're spending less! 🏆</div>
        <div className="flex justify-center gap-3 mt-4 text-4xl">
          {['🎊','✨','💰','🎯','⭐'].map((e, i) => (
            <span key={i} style={{ animation: `bounce 0.6s ease-in-out ${i * 0.1}s infinite alternate` }}>{e}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Warning Flash ─────────────────────────────────────────────────────────────
export function WarningFlash({ show }) {
  if (!show) return null
  return (
    <div
      className="fixed inset-0 z-[985] pointer-events-none"
      style={{
        background: 'rgba(255,94,122,0.08)',
        animation: 'warningPulse 0.5s ease-in-out 3',
        border: '3px solid rgba(255,94,122,0.4)',
        borderRadius: '0',
      }}
    />
  )
}

// ── Floating number animation when expense added ──────────────────────────────
export function FloatingAmount({ amount, currency, x, y, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200)
    return () => clearTimeout(t)
  }, [])

  const sym = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[currency] || '₹'
  return (
    <div
      className="fixed pointer-events-none z-[997] font-mono font-bold text-rose text-xl"
      style={{
        left: x, top: y,
        animation: 'floatUp 1.2s ease-out forwards',
        textShadow: '0 0 10px rgba(255,94,122,0.6)',
      }}
    >
      -{sym}{Number(amount).toLocaleString()}
    </div>
  )
}
