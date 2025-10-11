# Quick Start Guide - Unified Card System
## Getting Started with the New Card Components

**Version**: 1.0.0
**Last Updated**: 2025-10-11

---

## 🚀 Quick Start (5 Minutes)

### 1. Enable Feature Flag (Development)

Open browser console:

```javascript
// Enable new card system
FeatureFlags.enableFeature('NEW_CARD_SYSTEM');

// Enable partner variant
FEATURES.CARD_VARIANTS.partner = true;

// Verify
FeatureFlags.logFeatureFlags();
```

### 2. Create Your First Card

```javascript
// Get the template
const template = document.getElementById('card-template');
const element = template.content.cloneNode(true).firstElementChild;

// Add to DOM
document.body.appendChild(element);

// Create card instance
const card = new PartnerCard(element, {
  data: {
    id: 123,
    name: 'jane',
    display_name_for_ui: 'Jane',
    profile_image_url: '/images/user1.jpg',
    quiz_count: 12,
    affinity_score: 25
  },
  onSelect: (data, card) => {
    console.log('User selected:', data);
    alert(`You selected ${data.display_name_for_ui}!`);
  }
});
```

### 3. Test It

- **Click**: Should trigger onSelect callback
- **Keyboard**: Tab to card, press Enter or Space
- **Hover**: Should show hover effect (desktop only)

---

## 📚 Common Tasks

### Task 1: Render Multiple Cards

```javascript
const users = [
  { id: 1, name: 'user1', quiz_count: 10, affinity_score: 20 },
  { id: 2, name: 'user2', quiz_count: 15, affinity_score: 30 },
  { id: 3, name: 'user3', quiz_count: 8, affinity_score: 15 }
];

const container = document.getElementById('partner-cards-container');
const template = document.getElementById('card-template');

const cards = users.map(userData => {
  const element = template.content.cloneNode(true).firstElementChild;
  container.appendChild(element);

  return new PartnerCard(element, {
    data: userData,
    onSelect: (data) => startQuiz(data.id)
  });
});
```

### Task 2: Update Card Data

```javascript
// Update existing card
card.updateData({
  quiz_count: 15,
  affinity_score: 35
});

// Card will automatically re-render
```

### Task 3: Handle Loading States

```javascript
// Show loading
card.setLoading(true);

// Fetch data
fetch('/api/user/123')
  .then(response => response.json())
  .then(data => {
    card.updateData(data);
    card.setLoading(false);
  })
  .catch(error => {
    card.setError('Failed to load user data');
    card.setLoading(false);
  });
```

### Task 4: Clean Up Cards

```javascript
// When removing cards (e.g., navigation away)
cards.forEach(card => card.destroy());
cards = [];

// Clear container
container.innerHTML = '';
```

---

## 🎨 Styling Customization

### Using Design Tokens

```css
/* Custom card variant */
.card--custom {
  background: var(--color-bg-light);
  border: 2px solid var(--color-accent-200);
  padding: var(--space-lg);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.card--custom:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}
```

### Override Specific Properties

```css
/* Make partner cards smaller on mobile */
@media (max-width: 480px) {
  .card--partner {
    max-width: 320px;
    height: 500px;
  }
}
```

---

## 🔧 Debugging

### Enable Debug Mode

```javascript
// See all card events in console
const card = new CardComponent(element, {
  data: userData,
  onSelect: (data, card) => {
    console.log('[DEBUG] Card selected');
    console.log('[DEBUG] Data:', data);
    console.log('[DEBUG] Card state:', card.getState());
  },
  onHover: (data) => {
    console.log('[DEBUG] Card hovered:', data.name);
  }
});
```

### Common Issues

**Q: Card not rendering?**
```javascript
// Check data
console.log('Card data:', card.getData());

// Check state
console.log('Card state:', card.getState());

// Try manual render
card.render();
```

**Q: Events not firing?**
```javascript
// Check if card is disabled
console.log('Disabled?', card.state.disabled);

// Check if loading
console.log('Loading?', card.state.loading);

// Re-setup event listeners
card.setupEventListeners();
```

**Q: Styles not applying?**
```html
<!-- Verify CSS files loaded -->
<link rel="stylesheet" href="/styles/design-tokens.css">
<link rel="stylesheet" href="/styles/card-system/core/card-base.css">
<link rel="stylesheet" href="/styles/card-system/core/card-variants.css">
```

---

## 📱 Mobile Testing

### Test Checklist
- [ ] Cards render at 320px width
- [ ] Touch targets are 44x44px minimum
- [ ] Swipe gestures work (if applicable)
- [ ] No horizontal scroll
- [ ] Font sizes readable
- [ ] Images load and scale properly

### Browser Testing
- [ ] Chrome Mobile (Android)
- [ ] Safari iOS
- [ ] Samsung Internet
- [ ] Firefox Mobile

---

## ♿ Accessibility Testing

### Quick Test
1. **Tab Navigation**: Can you reach all cards?
2. **Keyboard Activation**: Does Enter/Space select?
3. **Focus Indicators**: Are they visible?
4. **Screen Reader**: Does it announce correctly?

### Tools
- **Chrome DevTools**: Lighthouse accessibility audit
- **Axe DevTools**: Browser extension
- **NVDA**: Free screen reader (Windows)
- **VoiceOver**: Built-in screen reader (Mac/iOS)

---

## 🚢 Deployment Checklist

### Before Going Live

1. **Feature Flag Configuration**
```javascript
// production environment
FEATURES.NEW_CARD_SYSTEM.enabled = true;
FEATURES.NEW_CARD_SYSTEM.rolloutPercentage = 10; // Start at 10%
FEATURES.CARD_VARIANTS.partner = true;
```

2. **Testing**
- [ ] Visual regression tests passed
- [ ] Accessibility audit passed (>90 score)
- [ ] Performance benchmarks met (<16ms render)
- [ ] Cross-browser testing complete
- [ ] Mobile device testing complete

3. **Monitoring**
- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] User feedback collection ready

4. **Rollback Plan**
- [ ] Feature flag can be disabled instantly
- [ ] Old system still available
- [ ] Monitoring alerts configured

### Gradual Rollout Strategy

```javascript
// Week 1: 10% rollout
FEATURES.NEW_CARD_SYSTEM.rolloutPercentage = 10;

// Week 2: 25% rollout (if no issues)
FEATURES.NEW_CARD_SYSTEM.rolloutPercentage = 25;

// Week 3: 50% rollout
FEATURES.NEW_CARD_SYSTEM.rolloutPercentage = 50;

// Week 4: 100% rollout
FEATURES.NEW_CARD_SYSTEM.rolloutPercentage = 100;
```

---

## 📖 Reference Links

- **Full Documentation**: `public/styles/card-system/README.md`
- **Implementation Plan**: `project-management/USER_CARD_IMPROVEMENT_PLAN.md`
- **Phase 1 Summary**: `PHASE1_IMPLEMENTATION_SUMMARY.md`

---

## 💡 Tips & Best Practices

### Performance
- Use lazy loading for images: `<img loading="lazy">`
- Batch card updates: Update data, then render once
- Clean up cards when removing: Always call `destroy()`
- Use CSS transforms for animations (GPU-accelerated)

### Accessibility
- Always provide alt text for images
- Use semantic HTML (article, header, footer)
- Test with keyboard only
- Verify color contrast (4.5:1 minimum)

### Maintainability
- Use design tokens for all colors/spacing
- Keep card logic in component classes
- Document any custom variants
- Write tests for new features

---

## 🆘 Getting Help

1. **Check Documentation**: Most answers are in README.md
2. **Console Logs**: All components log initialization and errors
3. **Browser DevTools**: Inspect element, check console
4. **Feature Flags**: Verify flags are enabled correctly

---

**Happy Coding! 🎉**

Questions? Check the full documentation in `card-system/README.md`
