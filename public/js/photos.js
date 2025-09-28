// Photo Management for A&B Meeting App
class PhotoManager {
  constructor() {
    this.uploading = false;
    this.init();
  }

  init() {
    this.setupPhotoUpload();
    this.setupDragAndDrop();
  }

  setupPhotoUpload() {
    // Add photo button
    const addPhotoBtn = document.getElementById('add-photo-btn');
    if (addPhotoBtn) {
      addPhotoBtn.addEventListener('click', () => this.openPhotoUpload());
    }

    // File input
    const fileInput = document.getElementById('photo-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Select photo button
    const selectPhotoBtn = document.getElementById('select-photo-btn');
    if (selectPhotoBtn) {
      selectPhotoBtn.addEventListener('click', () => {
        document.getElementById('photo-file-input').click();
      });
    }
  }

  setupDragAndDrop() {
    const uploadArea = document.getElementById('photo-upload-area');
    if (!uploadArea) return;

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragging');
    });

    uploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragging');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragging');

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        this.handleFileSelect({ target: { files } });
      }
    });
  }

  // Open photo upload modal
  openPhotoUpload() {
    this.resetUploadForm();
    ui.openModal('photo-upload-modal');
  }

  // Reset upload form
  resetUploadForm() {
    const fileInput = document.getElementById('photo-file-input');
    const uploadArea = document.getElementById('photo-upload-area');
    const uploadProgress = document.getElementById('upload-progress');

    if (fileInput) fileInput.value = '';
    if (uploadArea) uploadArea.classList.remove('dragging');
    if (uploadProgress) uploadProgress.style.display = 'none';

    this.uploading = false;
  }

  // Handle file selection
  async handleFileSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const file = files[0];

    // Validate file
    if (!this.validateFile(file)) {
      return;
    }

    await this.uploadPhoto(file);
  }

  // Validate photo file
  validateFile(file) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      ui.showToast('지원되지 않는 파일 형식입니다. (JPEG, PNG, WebP만 가능)', 'error');
      return false;
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      ui.showToast('파일 크기가 너무 큽니다. (최대 10MB)', 'error');
      return false;
    }

    return true;
  }

  // Upload photo
  async uploadPhoto(file) {
    if (this.uploading) return;

    this.uploading = true;
    this.showUploadProgress(0, '업로드 준비 중...');

    try {
      // Step 1: Get presigned URL
      this.updateUploadProgress(10, '업로드 URL 생성 중...');

      const presignData = await api.generatePresignUrl(
        file.name,
        file.type,
        'PROFILE'
      );

      const { upload_url, photo_id } = presignData.data;

      // Step 2: Upload to storage
      this.updateUploadProgress(20, '사진 업로드 중...');

      await this.uploadToStorage(upload_url, file, (progress) => {
        this.updateUploadProgress(20 + (progress * 0.6), '사진 업로드 중...');
      });

      // Step 3: Commit photo
      this.updateUploadProgress(85, '사진 처리 중...');

      await api.commitPhoto(photo_id);

      // Step 4: Complete
      this.updateUploadProgress(100, '완료!');

      ui.showToast('사진이 성공적으로 업로드되었습니다!', 'success');

      // Close modal and refresh photos
      setTimeout(() => {
        ui.closeModal('photo-upload-modal');
        if (ui.currentView === 'photos') {
          ui.loadPhotosData();
        }
      }, 1000);

    } catch (error) {
      console.error('Photo upload error:', error);
      ui.showToast(error.message || '사진 업로드 실패', 'error');
      this.hideUploadProgress();
    } finally {
      this.uploading = false;
    }
  }

  // Upload file to storage with progress
  async uploadToStorage(uploadUrl, file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = e.loaded / e.total;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }

  // Show upload progress
  showUploadProgress(progress, status) {
    const uploadProgress = document.getElementById('upload-progress');
    if (uploadProgress) {
      uploadProgress.style.display = 'block';
    }

    this.updateUploadProgress(progress, status);
  }

  // Update upload progress
  updateUploadProgress(progress, status) {
    const progressFill = document.getElementById('upload-progress-fill');
    const statusElement = document.getElementById('upload-status');

    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }

    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  // Hide upload progress
  hideUploadProgress() {
    const uploadProgress = document.getElementById('upload-progress');
    if (uploadProgress) {
      uploadProgress.style.display = 'none';
    }
  }

  // Get photo dimensions from file
  async getPhotoDimensions(file) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() {
        resolve({
          width: this.width,
          height: this.height
        });
      };
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = URL.createObjectURL(file);
    });
  }

  // Extract EXIF data from file
  async extractExifData(file) {
    try {
      const dimensions = await this.getPhotoDimensions(file);

      return {
        filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        width: dimensions.width,
        height: dimensions.height,
        upload_timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting EXIF data:', error);
      return null;
    }
  }

  // Compress image if needed
  async compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = function() {
        // Calculate new dimensions
        let { width, height } = this;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(this, 0, 0, width, height);

        canvas.toBlob(resolve, 'image/jpeg', quality);
      };

      img.onerror = () => resolve(file); // Return original if compression fails
      img.src = URL.createObjectURL(file);
    });
  }

  // Resize image for different purposes
  async resizeImage(file, targetWidth, targetHeight) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = function() {
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Calculate scaling to maintain aspect ratio
        const scale = Math.min(targetWidth / this.width, targetHeight / this.height);
        const scaledWidth = this.width * scale;
        const scaledHeight = this.height * scale;

        // Center the image
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;

        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // Draw image
        ctx.drawImage(this, x, y, scaledWidth, scaledHeight);

        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }

  // Preview image before upload
  previewImage(file, container) {
    const reader = new FileReader();

    reader.onload = function(e) {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '200px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '8px';

      container.innerHTML = '';
      container.appendChild(img);
    };

    reader.readAsDataURL(file);
  }

  // Batch upload multiple photos
  async uploadMultiplePhotos(files) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!this.validateFile(file)) {
        results.push({
          file: file.name,
          success: false,
          error: 'Invalid file'
        });
        continue;
      }

      try {
        await this.uploadPhoto(file);
        results.push({
          file: file.name,
          success: true
        });
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Get optimal image format for upload
  getOptimalFormat(file) {
    // Use WebP for smaller file sizes if supported
    const canvas = document.createElement('canvas');
    const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp');

    if (supportsWebP && file.type !== 'image/png') {
      return 'image/webp';
    }

    return 'image/jpeg';
  }
}

// Create global photo manager instance
window.photos = new PhotoManager();