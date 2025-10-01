# Accessibility Testing & Validation Guide

## Automated Testing Tools

### 1. axe-core Integration
```html
<!-- Add to development environment -->
<script src="https://unpkg.com/@axe-core/axe-core/dist/axe.min.js"></script>
<script>
  if (window.location.hostname === 'localhost') {
    axe.run(function (err, results) {
      if (err) throw err;
      console.log('Accessibility violations:', results.violations);
      console.log('Accessibility passes:', results.passes);
    });
  }
</script>
```

### 2. Color Contrast Testing
```javascript
// Automated contrast checking
function checkContrast() {
  const textElements = document.querySelectorAll('p, span, a, button, label, h1, h2, h3, h4, h5, h6');

  textElements.forEach(element => {
    const styles = window.getComputedStyle(element);
    const color = styles.color;
    const backgroundColor = styles.backgroundColor;

    // Use contrast checking library or API
    console.log(`Element: ${element.tagName}, Color: ${color}, Background: ${backgroundColor}`);
  });
}
```

## Manual Testing Procedures

### 1. Keyboard Navigation Test
**Steps:**
1. Disconnect mouse/trackpad
2. Use only Tab, Shift+Tab, Enter, Space, Arrow keys
3. Verify all functionality accessible
4. Check focus indicators are visible
5. Ensure logical tab order

**Critical Test Points:**
- [ ] Main navigation works with keyboard
- [ ] Quiz options selectable with keyboard
- [ ] Modals can be opened/closed with keyboard
- [ ] Form submission works without mouse
- [ ] Photo upload accessible via keyboard

### 2. Screen Reader Test
**Tools:** NVDA (Windows), JAWS (Windows), VoiceOver (Mac)

**Test Script:**
1. Navigate page with headings (H key)
2. Navigate by landmarks (D key)
3. Navigate forms (F key)
4. Navigate links (K key)
5. Navigate buttons (B key)

**Expected Behaviors:**
- [ ] Page title read correctly
- [ ] Heading structure makes sense
- [ ] Form fields have clear labels
- [ ] Interactive elements announce their purpose
- [ ] Error messages are announced

### 3. Mobile Accessibility Test
**Focus Areas:**
- [ ] Touch target sizes minimum 44px
- [ ] Pinch-to-zoom works properly
- [ ] Screen reader on mobile works
- [ ] Voice control compatibility

## Performance Testing

### Color Contrast Audit Results
```
FAILING COMBINATIONS (Must Fix):
- Points Display: 2.8:1 ratio (needs 4.5:1)
- Nav Labels: 4.3:1 ratio (needs 4.5:1)
- Modal Close: 3.1:1 ratio (needs 4.5:1)

PASSING COMBINATIONS:
- Main headings: 7.2:1 ratio ✅
- Body text: 8.9:1 ratio ✅
- Primary buttons: 5.1:1 ratio ✅
```

### Touch Target Audit
```
SMALL TARGETS (Need Fixing):
- Modal close button: 30px × 30px (needs 44px)
- Notification badge: 20px × 20px (needs 44px)
- Character images: Variable sizes (ensure 44px minimum for interactive)

ADEQUATE TARGETS:
- Primary buttons: 48px × 40px ✅
- Navigation items: 44px × 44px ✅
- Quiz options: 80px × 100px ✅
```

## Browser Testing Matrix

### Desktop Browsers
| Browser | Screen Reader | Status |
|---------|---------------|---------|
| Chrome | NVDA | ⚠️ Test needed |
| Firefox | NVDA | ⚠️ Test needed |
| Edge | JAWS | ⚠️ Test needed |
| Safari | VoiceOver | ⚠️ Test needed |

### Mobile Browsers
| Browser | Screen Reader | Status |
|---------|---------------|---------|
| Safari iOS | VoiceOver | ⚠️ Test needed |
| Chrome Android | TalkBack | ⚠️ Test needed |
| Samsung Internet | TalkBack | ⚠️ Test needed |

## WCAG 2.1 Compliance Checklist

### Level A (Minimum)
- [ ] 1.1.1 Non-text Content
- [ ] 1.2.1 Audio-only and Video-only
- [ ] 1.3.1 Info and Relationships
- [ ] 1.3.2 Meaningful Sequence
- [ ] 1.3.3 Sensory Characteristics
- [ ] 1.4.1 Use of Color
- [ ] 1.4.2 Audio Control
- [ ] 2.1.1 Keyboard
- [ ] 2.1.2 No Keyboard Trap
- [ ] 2.1.4 Character Key Shortcuts
- [ ] 2.2.1 Timing Adjustable
- [ ] 2.2.2 Pause, Stop, Hide
- [ ] 2.3.1 Three Flashes or Below
- [ ] 2.4.1 Bypass Blocks
- [ ] 2.4.2 Page Titled
- [ ] 2.4.3 Focus Order
- [ ] 2.4.4 Link Purpose
- [ ] 2.5.1 Pointer Gestures
- [ ] 2.5.2 Pointer Cancellation
- [ ] 2.5.3 Label in Name
- [ ] 2.5.4 Motion Actuation
- [ ] 3.1.1 Language of Page
- [ ] 3.2.1 On Focus
- [ ] 3.2.2 On Input
- [ ] 3.3.1 Error Identification
- [ ] 3.3.2 Labels or Instructions
- [ ] 4.1.1 Parsing
- [ ] 4.1.2 Name, Role, Value

### Level AA (Target)
- [ ] 1.2.4 Captions (Live)
- [ ] 1.2.5 Audio Description
- [ ] 1.3.4 Orientation
- [ ] 1.3.5 Identify Input Purpose
- [ ] 1.4.3 Contrast (Minimum) ⚠️
- [ ] 1.4.4 Resize text
- [ ] 1.4.5 Images of Text
- [ ] 1.4.10 Reflow
- [ ] 1.4.11 Non-text Contrast
- [ ] 1.4.12 Text Spacing
- [ ] 1.4.13 Content on Hover or Focus
- [ ] 2.4.5 Multiple Ways
- [ ] 2.4.6 Headings and Labels
- [ ] 2.4.7 Focus Visible ⚠️
- [ ] 2.5.5 Target Size ⚠️
- [ ] 3.1.2 Language of Parts
- [ ] 3.2.3 Consistent Navigation
- [ ] 3.2.4 Consistent Identification
- [ ] 3.3.3 Error Suggestion
- [ ] 3.3.4 Error Prevention
- [ ] 4.1.3 Status Messages

## Testing Schedule

### Week 1: Critical Fixes
- Implement color contrast fixes
- Add form labels
- Convert divs to buttons
- Add focus indicators

### Week 2: Validation
- Run automated tests (axe-core)
- Manual keyboard testing
- Screen reader testing
- Mobile accessibility testing

### Week 3: Refinement
- Address remaining violations
- Performance optimization
- Cross-browser testing
- Final WCAG compliance audit

## Success Metrics

**Target Metrics:**
- 0 critical accessibility violations
- 95%+ WCAG 2.1 AA compliance
- <2 seconds for screen reader navigation
- 100% keyboard functionality coverage