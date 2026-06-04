/**
 * Fly-to-Cart animation
 * สร้าง bubble เล็กๆ จาก sourceEl แล้วบินไปหา [data-cart-target]
 */
export function flyToCart(sourceEl: HTMLElement, imageUrl?: string) {
  // bottom nav cart (mobile) → desktop header cart button fallback
  const target = (
    document.querySelector('[data-cart-target]') ??
    document.querySelector('[data-cart-target-desktop]')
  ) as HTMLElement | null
  if (!target) return

  const src = sourceEl.getBoundingClientRect()
  const dst = target.getBoundingClientRect()

  const SIZE = 36
  const startX = src.left + src.width / 2 - SIZE / 2
  const startY = src.top + src.height / 2 - SIZE / 2

  const bubble = document.createElement('div')
  bubble.style.cssText = `
    position: fixed;
    z-index: 9999;
    width: ${SIZE}px;
    height: ${SIZE}px;
    border-radius: 50%;
    overflow: hidden;
    background: #ea580c;
    left: ${startX}px;
    top: ${startY}px;
    pointer-events: none;
    will-change: transform, opacity;
    box-shadow: 0 4px 12px rgba(234,88,12,0.5);
  `

  if (imageUrl) {
    const img = document.createElement('img')
    img.src = imageUrl
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;'
    bubble.appendChild(img)
  } else {
    bubble.style.display = 'flex'
    bubble.style.alignItems = 'center'
    bubble.style.justifyContent = 'center'
    bubble.style.color = 'white'
    bubble.style.fontSize = '18px'
    bubble.style.fontWeight = 'bold'
    bubble.textContent = '+'
  }

  document.body.appendChild(bubble)

  const dx = dst.left + dst.width / 2 - (startX + SIZE / 2)
  const dy = dst.top + dst.height / 2 - (startY + SIZE / 2)

  // Double rAF เพื่อให้ browser paint initial position ก่อน
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bubble.style.transition =
        'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease 0.2s, width 0.55s ease, height 0.55s ease'
      bubble.style.transform = `translate(${dx}px, ${dy}px) scale(0.25)`
      bubble.style.opacity = '0'
    })
  })

  setTimeout(() => bubble.remove(), 650)
}
