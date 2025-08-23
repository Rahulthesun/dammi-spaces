
export async function generateThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true; // required for autoplay in some browsers
    video.playsInline = true;

    // Seek to 1 second (or as close as possible)
    video.currentTime = 1;

    video.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create thumbnail'));
            return;
          }
          const thumbnailFile = new File([blob], `thumb-${file.name}.jpg`, {
            type: 'image/jpeg',
          });
          resolve(thumbnailFile);
        }, 'image/jpeg');
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(video.src); // cleanup
      }
    };

    video.onerror = (err) => reject(err);
  });
}

