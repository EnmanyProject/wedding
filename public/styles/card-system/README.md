# Unified Card Component System

**Wedding App - Card System Documentation**

Version: 1.0.0
Date: 2025-10-11
Status: Phase 1 Complete (Foundation)

---

## Overview

This document describes the unified card component system for the wedding app. The system provides a consistent, accessible, and maintainable architecture for all card types across the application.

### Goals

- **Consistency**: Single source of truth for card design patterns
- **Accessibility**: WCAG 2.1 AA compliance (90+ score)
- **Maintainability**: 60% code reduction through component reuse
- **Performance**: <16ms render time, 60fps animations
- **Extensibility**: Easy to add new card types

---

## Architecture

### Component Hierarchy

```
card-system/
├── core/
│   ├── card-base.css         (Base structure - 150 lines)
│   └── card-variants.css     (4 variants - 200 lines)
└── README.md (this file)
```

### Design Tokens

All cards use centralized design tokens from `design-tokens.css`:

- **Colors**: Primary pink, secondary blue, accent gold, neutrals
- **Spacing**: 8px base system (xs to 2xl)
- **Typography**: Font sizes, weights, line heights
- **Shadows**: Standard shadows + glow effects
- **Transitions**: Fast (150ms), base (250ms), slow (350ms)

---

## Card Variants

### 1. Partner Card (`.card--partner`)

**Usage**: Dating/recommendation cards in home view

**Features**:
- Dark gradient background
- Pink neon border with glow effect
- 400x600px fixed size
- Profile avatar (160px)
- Quiz/affinity stats

**HTML Template**:
```html
<article class="card card--partner"
         role="article"
         aria-labelledby="card-123-title"
         tabindex="0"
         data-user-id="123">
  <header class="card__header">
    <div class="card__avatar">
      <img src="..." alt="Profile photo" class="card__avatar-image">
    </div>
    <h3 id="card-123-title" class="card__title">Jane</h3>
    <p class="card__subtitle">@jane</p>
  </header>

  <div class="card__body">
    <div class="card__stats">
      <div class="stat-item">
        <span class="stat-item__icon">🎯</span>
        <span class="stat-item__value">12</span>
        <span class="stat-item__label">퀴즈 참여</span>
      </div>
    </div>
  </div>

  <footer class="card__footer">
    <button class="btn btn--primary">Start Quiz</button>
  </footer>
</article>
```

**JavaScript**:
```javascript
import { PartnerCard } from './components/partner-card.js';

const cardElement = document.querySelector('.card--partner');
const card = new PartnerCard(cardElement, {
  data: userData,
  onSelect: (data, card) => {
    console.log('User selected:', data);
    startQuiz(data.id);
  }
});
```

### 2. Pawnshop Card (`.card--pawnshop`)

**Usage**: Pawnshop system user display

**Features**:
- Dark gradient background
- Gold border with glow effect
- Compact size (280px min-height)
- Transaction-style design

### 3. Profile Modal Card (`.card--profile`)

**Usage**: Detailed user information in modal overlay

**Features**:
- Black background
- Deep pink border
- 500px max-width, 80vh max-height
- Scrollable content
- Circular verification badges

### 4. Ranking Card (`.card--ranking`)

**Usage**: User ranking display

**Features**:
- Light background
- Horizontal layout
- Rank number badge
- Compact sizing

---

## JavaScript API

### CardComponent (Base Class)

```javascript
// Constructor
const card = new CardComponent(element, options);

// Options
{
  variant: 'partner',           // Card type
  data: {},                     // Card data
  onSelect: (data, card) => {}, // Selection callback
  onHover: (data, card) => {},  // Hover callback
  onFocus: (data, card) => {}   // Focus callback
}

// Methods
card.select()                   // Select card
card.deselect()                 // Deselect card
card.setLoading(true)           // Show loading state
card.setDisabled(true)          // Disable card
card.setError('Error message')  // Show error state
card.updateData(newData)        // Update card data
card.render()                   // Re-render card
card.destroy()                  // Clean up (prevent memory leaks)

// State
card.getState()                 // Get current state
card.getData()                  // Get card data
```

### PartnerCard (Subclass)

```javascript
// Extends CardComponent
const card = new PartnerCard(element, options);

// Additional methods
card.renderAvatar(data)         // Update avatar
card.renderTitle(data)          // Update title
card.renderUsername(data)       // Update username
card.renderStats(data)          // Update stats
card.createStatItem(config)     // Create stat element
```

---

## Accessibility

### WCAG 2.1 AA Compliance

All cards include:

- **ARIA Attributes**: `role`, `aria-labelledby`, `aria-selected`, `aria-busy`
- **Keyboard Navigation**: Enter/Space to select, Escape to deselect
- **Focus Indicators**: 3px outline on focus-visible
- **Screen Reader Support**: Proper semantic HTML and ARIA labels
- **Color Contrast**: 4.5:1 minimum ratio
- **Touch Targets**: 44x44px minimum size

### Reduced Motion

Respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .card {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast Mode

Supports `prefers-contrast: high`:

```css
@media (prefers-contrast: high) {
  .card:focus-visible {
    outline-width: 4px;
    outline-color: Highlight;
  }
}
```

---

## Feature Flags

Control new card system rollout with feature flags:

```javascript
// feature-flags.js
const FEATURES = {
  NEW_CARD_SYSTEM: {
    enabled: false,           // Master switch
    rolloutPercentage: 0,     // Gradual rollout (0-100)
    allowlist: [],            // Beta testers
    enableInDev: true         // Auto-enable in development
  }
};

// Usage
if (FeatureFlags.useNewCardSystem('partner')) {
  renderNewPartnerCard(data);
} else {
  renderOldPartnerCard(data);
}
```

---

## Migration Guide

### From Old System to New System

**Step 1**: Import new CSS and JS

```html
<!-- Add to index.html -->
<link rel="stylesheet" href="/styles/design-tokens.css">
<link rel="stylesheet" href="/styles/card-system/core/card-base.css">
<link rel="stylesheet" href="/styles/card-system/core/card-variants.css">

<script src="/js/feature-flags.js"></script>
<script src="/js/components/card-component.js"></script>
<script src="/js/components/partner-card.js"></script>
```

**Step 2**: Enable feature flag

```javascript
// feature-flags.js
FEATURES.NEW_CARD_SYSTEM.enabled = true;
FEATURES.CARD_VARIANTS.partner = true;
```

**Step 3**: Update rendering logic

```javascript
// Old way (ui.js)
renderPartnerCards(targets) {
  const html = targets.map(t => `<div class="partner-card">...</div>`).join('');
  container.innerHTML = html;
}

// New way (with feature flag)
renderPartnerCards(targets) {
  if (FeatureFlags.useNewCardSystem('partner')) {
    this.renderNewPartnerCards(targets);
  } else {
    this.renderOldPartnerCards(targets);
  }
}

renderNewPartnerCards(targets) {
  this.cards = targets.map(target => {
    const element = this.createCardElement('partner', target);
    container.appendChild(element);

    return new PartnerCard(element, {
      data: target,
      onSelect: (data) => this.selectUserForQuiz(data.id)
    });
  });
}
```

**Step 4**: Test thoroughly

- [ ] Visual regression tests
- [ ] Accessibility audit (Axe DevTools)
- [ ] Keyboard navigation
- [ ] Screen reader testing
- [ ] Performance benchmarks

**Step 5**: Gradual rollout

```javascript
// Start with 10% rollout
FEATURES.NEW_CARD_SYSTEM.rolloutPercentage = 10;

// Increase gradually
// Week 1: 10%
// Week 2: 25%
// Week 3: 50%
// Week 4: 100%
```

---

## Performance

### Target Metrics

- **Card Render Time**: < 16ms (60fps)
- **Layout Recalculations**: 1 per render
- **Style Recalculations**: 1 per render
- **Animation FPS**: 60fps
- **Bundle Size**: < 40KB (minified + gzipped)

### Optimization Techniques

- **Lazy Loading**: Images load only when visible
- **Component Caching**: Reuse card instances
- **Batch Rendering**: Update multiple cards at once
- **CSS Containment**: Isolate layout/paint boundaries

---

## Testing

### Manual Testing Checklist

- [ ] Visual appearance matches design
- [ ] Hover effects work on desktop
- [ ] Touch interactions work on mobile
- [ ] Keyboard navigation (Tab, Enter, Space, Escape)
- [ ] Screen reader announces correctly
- [ ] Focus indicators visible
- [ ] Loading state displays
- [ ] Error state displays
- [ ] Selected state highlights
- [ ] Responsive on all breakpoints (320px, 480px, 768px, 1024px)

### Automated Testing

```javascript
// Jest + Testing Library
describe('PartnerCard', () => {
  it('should render user data', () => {
    const card = new PartnerCard(element, { data: mockUser });
    expect(element.querySelector('.card__title').textContent).toBe('Jane');
  });

  it('should handle selection', () => {
    const onSelect = jest.fn();
    const card = new PartnerCard(element, { data: mockUser, onSelect });
    card.element.click();
    expect(onSelect).toHaveBeenCalled();
  });

  it('should be keyboard accessible', () => {
    const card = new PartnerCard(element, { data: mockUser });
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    card.element.dispatchEvent(event);
    expect(card.state.selected).toBe(true);
  });
});
```

---

## Troubleshooting

### Card not rendering

1. Check feature flag: `FeatureFlags.logFeatureFlags()`
2. Verify CSS files loaded: Check browser Network tab
3. Check console for errors
4. Validate card data structure

### Styling issues

1. Ensure design-tokens.css loads first
2. Check CSS specificity (avoid `!important`)
3. Verify variant class applied (`.card--partner`)
4. Check browser DevTools computed styles

### Accessibility issues

1. Run Axe DevTools audit
2. Test keyboard navigation manually
3. Test with screen reader (NVDA/JAWS)
4. Check ARIA attributes in DOM

---

## Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | Full |
| Firefox | 88+ | Full |
| Safari | 14+ | Full |
| Edge | 90+ | Full |
| iOS Safari | 14+ | Full |
| Chrome Mobile | 90+ | Full |

**Minimum Requirements**:
- CSS Grid
- CSS Custom Properties
- CSS Scroll Snap
- Intersection Observer API

---

## Contributing

### Adding a New Card Variant

1. **Define variant in `card-variants.css`**

```css
.card--custom {
  background: var(--color-custom);
  border: 2px solid var(--color-custom-border);
  /* Add variant-specific styles */
}
```

2. **Create JavaScript subclass**

```javascript
class CustomCard extends CardComponent {
  constructor(element, options) {
    super(element, { ...options, variant: 'custom' });
  }

  render() {
    // Custom rendering logic
  }
}
```

3. **Add feature flag**

```javascript
FEATURES.CARD_VARIANTS.custom = false;
```

4. **Write tests**
5. **Update documentation**

---

## Support

For questions or issues:

- Check this README
- Review code comments
- Check project CLAUDE.md for version history
- Ask in team chat

---

## Changelog

### v1.0.0 (2025-10-11)

- Initial implementation
- Design tokens system
- Base card component
- 4 card variants (partner, pawnshop, profile, ranking)
- JavaScript component class
- Feature flags system
- Complete documentation

---

**Next Steps**: Phase 2 - Partner Cards Migration

See [USER_CARD_IMPROVEMENT_PLAN.md](../../../project-management/USER_CARD_IMPROVEMENT_PLAN.md) for full implementation plan.
