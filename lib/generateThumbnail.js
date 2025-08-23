export async function generateThumbnail(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.muted = true;       // required for autoplay in some browsers
    video.playsInline = true;

    // When metadata is loaded, seek to 1 second
    video.onloadedmetadata = () => {
      // Some videos might be shorter than 1s
      const seekTime = Math.min(1, video.duration - 0.1);
      video.currentTime = seekTime;
    };

    // When seeking completes, draw frame
    video.onseeked = () => {
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

          // ✅ Only revoke after we’ve created the thumbnail
          URL.revokeObjectURL(video.src);

          resolve(thumbnailFile);
        }, 'image/jpeg');
      } catch (err) {
        URL.revokeObjectURL(video.src); // cleanup in case of error
        reject(err);
      }
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(video.src); // cleanup
      reject(err);
    };
  });
}
