import { useState, useEffect, useRef } from 'react'

// SVG cartoon characters for different moods/categories
const CHARACTERS = {
  happy: ({ size = 80 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="30" fill="#FFD93D" stroke="#FF6B6B" strokeWidth="2"/>
      <ellipse cx="40" cy="42" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="60" cy="42" rx="5" ry="6" fill="#fff"/>
      <circle cx="40" cy="43" r="3" fill="#333"/>
      <circle cx="60" cy="43" r="3" fill="#333"/>
      <circle cx="41" cy="42" r="1" fill="#fff"/>
      <circle cx="61" cy="42" r="1" fill="#fff"/>
      <path d="M38 55 Q50 65 62 55" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="37" cy="47" rx="4" ry="3" fill="#FF9999" opacity="0.6"/>
      <ellipse cx="63" cy="47" rx="4" ry="3" fill="#FF9999" opacity="0.6"/>
      {/* Body */}
      <ellipse cx="50" cy="78" rx="18" ry="14" fill="#6C63FF"/>
      {/* Arms */}
      <ellipse cx="27" cy="70" rx="7" ry="4" fill="#FFD93D" transform="rotate(-30 27 70)"/>
      <ellipse cx="73" cy="70" rx="7" ry="4" fill="#FFD93D" transform="rotate(30 73 70)"/>
    </svg>
  ),
  sad: ({ size = 80 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="30" fill="#FFD93D" stroke="#888" strokeWidth="2"/>
      <ellipse cx="40" cy="42" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="60" cy="42" rx="5" ry="6" fill="#fff"/>
      <circle cx="40" cy="44" r="3" fill="#333"/>
      <circle cx="60" cy="44" r="3" fill="#333"/>
      <path d="M38 60 Q50 52 62 60" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Tears */}
      <ellipse cx="38" cy="50" rx="2" ry="3" fill="#88CCFF" opacity="0.8"/>
      <ellipse cx="62" cy="50" rx="2" ry="3" fill="#88CCFF" opacity="0.8"/>
      {/* Worried brows */}
      <path d="M35 36 Q40 33 45 36" stroke="#333" strokeWidth="2" fill="none"/>
      <path d="M55 36 Q60 33 65 36" stroke="#333" strokeWidth="2" fill="none"/>
      <ellipse cx="50" cy="78" rx="18" ry="14" fill="#888"/>
      <ellipse cx="27" cy="73" rx="7" ry="4" fill="#FFD93D" transform="rotate(20 27 73)"/>
      <ellipse cx="73" cy="73" rx="7" ry="4" fill="#FFD93D" transform="rotate(-20 73 73)"/>
    </svg>
  ),
  shocked: ({ size = 80 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="30" fill="#FFD93D" stroke="#FF6B00" strokeWidth="2"/>
      <ellipse cx="40" cy="41" rx="7" ry="8" fill="#fff"/>
      <ellipse cx="60" cy="41" rx="7" ry="8" fill="#fff"/>
      <circle cx="40" cy="42" r="4" fill="#333"/>
      <circle cx="60" cy="42" r="4" fill="#333"/>
      <circle cx="38" cy="40" r="1.5" fill="#fff"/>
      <circle cx="58" cy="40" r="1.5" fill="#fff"/>
      {/* Open mouth shock */}
      <ellipse cx="50" cy="58" rx="8" ry="6" fill="#333"/>
      <ellipse cx="50" cy="57" rx="6" ry="4" fill="#FF6B6B"/>
      {/* Sweat */}
      <path d="M72 20 Q75 15 78 20 Q75 28 72 20" fill="#88CCFF"/>
      <ellipse cx="50" cy="78" rx="18" ry="14" fill="#FF6B00"/>
      <ellipse cx="25" cy="68" rx="7" ry="4" fill="#FFD93D" transform="rotate(-45 25 68)"/>
      <ellipse cx="75" cy="68" rx="7" ry="4" fill="#FFD93D" transform="rotate(45 75 68)"/>
    </svg>
  ),
  celebrating: ({ size = 80 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="30" fill="#FFD93D" stroke="#10D98A" strokeWidth="2"/>
      <ellipse cx="40" cy="41" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="60" cy="41" rx="5" ry="6" fill="#fff"/>
      <circle cx="40" cy="42" r="3" fill="#333"/>
      <circle cx="60" cy="42" r="3" fill="#333"/>
      <circle cx="41" cy="41" r="1" fill="#fff"/>
      <circle cx="61" cy="41" r="1" fill="#fff"/>
      {/* Big smile */}
      <path d="M35 54 Q50 68 65 54" stroke="#333" strokeWidth="3" fill="#FF9999" strokeLinecap="round"/>
      <ellipse cx="37" cy="47" rx="5" ry="4" fill="#FF9999" opacity="0.7"/>
      <ellipse cx="63" cy="47" rx="5" ry="4" fill="#FF9999" opacity="0.7"/>
      {/* Party hat */}
      <polygon points="50,5 38,30 62,30" fill="#FF6B6B"/>
      <polygon points="50,5 44,17 56,17" fill="#FFD93D" opacity="0.7"/>
      <circle cx="50" cy="5" r="3" fill="#FFD93D"/>
      <ellipse cx="50" cy="78" rx="18" ry="14" fill="#10D98A"/>
      {/* Arms up */}
      <ellipse cx="22" cy="60" rx="8" ry="4" fill="#FFD93D" transform="rotate(-60 22 60)"/>
      <ellipse cx="78" cy="60" rx="8" ry="4" fill="#FFD93D" transform="rotate(60 78 60)"/>
    </svg>
  ),
  worried: ({ size = 80 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="30" fill="#FFD93D" stroke="#FFAA3B" strokeWidth="2"/>
      <ellipse cx="40" cy="42" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="60" cy="42" rx="5" ry="6" fill="#fff"/>
      <circle cx="40" cy="43" r="3" fill="#333"/>
      <circle cx="60" cy="43" r="3" fill="#333"/>
      <path d="M38 58 Q50 54 62 58" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* Worried brows */}
      <path d="M33 35 Q40 31 46 35" stroke="#333" strokeWidth="2.5" fill="none"/>
      <path d="M54 35 Q60 31 67 35" stroke="#333" strokeWidth="2.5" fill="none"/>
      {/* Sweat drop */}
      <path d="M68 25 Q71 20 74 25 Q71 32 68 25" fill="#88CCFF"/>
      <ellipse cx="50" cy="78" rx="18" ry="14" fill="#FFAA3B"/>
      <ellipse cx="28" cy="71" rx="7" ry="4" fill="#FFD93D" transform="rotate(10 28 71)"/>
      <ellipse cx="72" cy="71" rx="7" ry="4" fill="#FFD93D" transform="rotate(-10 72 71)"/>
    </svg>
  ),
  money: ({ size = 80 }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="45" r="30" fill="#FFD93D" stroke="#10D98A" strokeWidth="2"/>
      <ellipse cx="40" cy="41" rx="5" ry="6" fill="#fff"/>
      <ellipse cx="60" cy="41" rx="5" ry="6" fill="#fff"/>
      {/* Dollar sign eyes */}
      <text x="36" y="47" fontSize="10" fill="#10D98A" fontWeight="bold">$</text>
      <text x="56" y="47" fontSize="10" fill="#10D98A" fontWeight="bold">$</text>
      <path d="M37 55 Q50 63 63 55" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <ellipse cx="50" cy="78" rx="18" ry="14" fill="#10D98A"/>
      {/* Holding money bag */}
      <circle cx="22" cy="68" r="8" fill="#FFD93D" stroke="#10D98A" strokeWidth="1.5"/>
      <text x="18" y="72" fontSize="9" fill="#10D98A" fontWeight="bold">₹</text>
      <ellipse cx="73" cy="70" rx="7" ry="4" fill="#FFD93D" transform="rotate(30 73 70)"/>
    </svg>
  ),
}

// Category-specific mini characters
const CATEGORY_EMOJIS = {
  'Food & Dining': { char: '🍔', color: '#FF9843' },
  'Rent & Utilities': { char: '🏠', color: '#38BDF8' },
  'Travel & Fuel': { char: '✈️', color: '#A78BFA' },
  'Tech & Gadgets': { char: '💻', color: '#6C63FF' },
  'Entertainment': { char: '🎬', color: '#F472B6' },
  'Health & Fitness': { char: '💊', color: '#10D98A' },
  'Shopping': { char: '🛍️', color: '#FBBF24' },
  'Subscriptions': { char: '📺', color: '#34D399' },
  'Education': { char: '📚', color: '#60A5FA' },
  'Miscellaneous': { char: '📦', color: '#9CA3AF' },
}

function getMood(momChangePct, totalMonth) {
  if (totalMonth === 0) return 'happy'
  if (momChangePct > 30) return 'shocked'
  if (momChangePct > 15) return 'worried'
  if (momChangePct < -10) return 'celebrating'
  if (momChangePct < 0) return 'money'
  if (momChangePct > 5) return 'worried'
  return 'happy'
}

function getMoodMessage(mood, momChangePct, totalMonth) {
  const msgs = {
    happy:       ["Looking good! 😊 Keep it up!", "Steady spending this month!", "You're doing great with your budget!"],
    celebrating: ["Amazing savings! 🎉 You're crushing it!", "Spending DOWN! Party time!", "Budget hero! 🏆"],
    worried:     ["Hmm, spending is climbing... 😅", "Watch out — costs are rising!", "Budget alert! Time to review."],
    shocked:     ["Whoa! Big spike this month! 😱", "YIKES! Spending jumped a lot!", "Emergency budget meeting needed!"],
    sad:         ["Rough month... 😢 Let's fix this!", "Overspending detected...", "Time to tighten the belt."],
    money:       ["Smart saver! 💰", "Keeping those receipts tight!", "On track and counting!"],
  }
  const arr = msgs[mood] || msgs.happy
  return arr[Math.floor(Date.now() / 10000) % arr.length]
}

export function FloatingCharacter({ summary, onParty }) {
  const mood = getMood(summary?.mom_change_pct ?? 0, summary?.total_month ?? 0)
  const message = getMoodMessage(mood, summary?.mom_change_pct, summary?.total_month)
  const Char = CHARACTERS[mood] || CHARACTERS.happy
  const [bounce, setBounce] = useState(false)
  const [showBubble, setShowBubble] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => setBounce(b => !b), 2000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (mood === 'celebrating' && onParty) {
      setTimeout(() => onParty(), 500)
    }
  }, [mood])

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2 select-none pointer-events-none">
      {showBubble && (
        <div
          className="bg-surface-700 border border-white/10 rounded-2xl rounded-br-none px-4 py-2.5 max-w-[200px] shadow-xl pointer-events-auto cursor-pointer"
          onClick={() => setShowBubble(false)}
          style={{ animation: 'slideUp 0.4s ease-out' }}
        >
          <p className="text-white/80 text-xs leading-relaxed">{message}</p>
          <div className="text-white/25 text-[10px] mt-0.5">click to dismiss</div>
        </div>
      )}
      <div
        className="pointer-events-auto cursor-pointer"
        style={{
          transform: bounce ? 'translateY(-8px)' : 'translateY(0)',
          transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
        }}
        onClick={() => setShowBubble(s => !s)}
      >
        <Char size={80} />
      </div>
    </div>
  )
}

export function CategoryCharacter({ category, amount, animate }) {
  const meta = CATEGORY_EMOJIS[category] || { char: '📦', color: '#9CA3AF' }
  return (
    <div
      className="flex flex-col items-center gap-1"
      style={{
        transform: animate ? 'scale(1.2) rotate(-5deg)' : 'scale(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
        style={{ background: meta.color + '22', border: `2px solid ${meta.color}44` }}
      >
        {meta.char}
      </div>
    </div>
  )
}

export { CHARACTERS, getMood, getMoodMessage }
