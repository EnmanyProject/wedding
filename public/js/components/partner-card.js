/**
 * Partner Card Component
 * Wedding App - Unified Card System
 *
 * Purpose: Dating/recommendation card with profile display
 * Extends: CardComponent
 *
 * @version 1.0.0
 * @date 2025-10-11
 */

// Import base class (if using modules)
// import { CardComponent } from './card-component.js';

/**
 * Partner Card Component
 * Specialized card for dating/recommendation context
 */
class PartnerCard extends CardComponent {
  /**
   * Create a new partner card
   * @param {HTMLElement} element - The card DOM element
   * @param {Object} options - Configuration options
   */
  constructor(element, options = {}) {
    // Set variant to 'partner'
    super(element, { ...options, variant: 'partner' });

    console.log(`[PartnerCard] Initialized for user:`, this.options.data.name);
  }

  /**
   * Render partner card with user data
   * Updates avatar, name, username, and stats
   */
  render() {
    const { data } = this.options;

    // Validate data
    if (!data || !data.id) {
      console.warn('[PartnerCard] Cannot render - invalid data');
      this.setError('Invalid user data');
      return;
    }

    try {
      // Update avatar
      this.renderAvatar(data);

      // Update title (display name)
      this.renderTitle(data);

      // Update username
      this.renderUsername(data);

      // Update stats
      this.renderStats(data);

      // Clear any errors
      this.setError(null);

      console.log(`[PartnerCard] Rendered successfully for:`, data.name);
    } catch (error) {
      console.error('[PartnerCard] Render error:', error);
      this.setError(error.message);
    }
  }

  /**
   * Render avatar/profile image
   * @param {Object} data - User data
   */
  renderAvatar(data) {
    const avatar = this.element.querySelector('.card__avatar-image');
    if (!avatar) return;

    // Set profile image URL
    const profileImageUrl = data.profile_image_url ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.name)}`;

    avatar.src = profileImageUrl;
    avatar.alt = `Profile photo of ${data.display_name_for_ui || data.name}`;

    // Add loading attribute for lazy loading
    avatar.loading = 'lazy';

    console.log(`[PartnerCard] Avatar rendered`);
  }

  /**
   * Render card title (display name)
   * @param {Object} data - User data
   */
  renderTitle(data) {
    const title = this.element.querySelector('.card__title');
    if (!title) return;

    const displayName = data.display_name_for_ui || data.display_name || data.name;
    title.textContent = displayName;

    console.log(`[PartnerCard] Title rendered:`, displayName);
  }

  /**
   * Render username/subtitle
   * @param {Object} data - User data
   */
  renderUsername(data) {
    const username = this.element.querySelector('.card__subtitle');
    if (!username) return;

    username.textContent = `@${data.name}`;

    console.log(`[PartnerCard] Username rendered`);
  }

  /**
   * Render quiz and affinity stats
   * @param {Object} data - User data
   */
  renderStats(data) {
    const statsContainer = this.element.querySelector('.card__stats');
    if (!statsContainer) return;

    // Clear existing stats
    statsContainer.innerHTML = '';

    // Quiz count stat
    const quizStat = this.createStatItem({
      icon: '🎯',
      value: data.quiz_count || 0,
      label: '퀴즈',
      ariaLabel: `Completed ${data.quiz_count || 0} quizzes`
    });

    // Affinity score stat
    const affinityStat = this.createStatItem({
      icon: '💕',
      value: data.affinity_score || 0,
      label: '궁합',
      ariaLabel: `Affinity score: ${data.affinity_score || 0}`
    });

    // Append stats
    statsContainer.appendChild(quizStat);
    statsContainer.appendChild(affinityStat);

    console.log(`[PartnerCard] Stats rendered - Quiz: ${data.quiz_count}, Affinity: ${data.affinity_score}`);
  }

  /**
   * Create a stat item element
   * @param {Object} config - Stat configuration
   * @returns {HTMLElement} Stat item element
   */
  createStatItem(config) {
    const statItem = document.createElement('div');
    statItem.className = 'stat-item';
    statItem.setAttribute('role', 'group');
    statItem.setAttribute('aria-label', config.ariaLabel);

    const icon = document.createElement('span');
    icon.className = 'stat-item__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = config.icon;

    const value = document.createElement('span');
    value.className = 'stat-item__value';
    value.textContent = config.value;

    const label = document.createElement('span');
    label.className = 'stat-item__label';
    label.textContent = config.label;

    statItem.appendChild(icon);
    statItem.appendChild(value);
    statItem.appendChild(label);

    return statItem;
  }

  /**
   * Get animal icon based on name (legacy support)
   * @param {string} name - User name
   * @returns {string} Animal emoji
   */
  getAnimalIcon(name) {
    // Legacy function for compatibility
    const animals = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return animals[hash % animals.length];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PartnerCard };
} else {
  window.PartnerCard = PartnerCard;
}
