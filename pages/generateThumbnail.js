import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

let ffmpeg;

export async function generateThumbnail(file) {
  if (!ffmpeg) {
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
  }

  // Load the video file into memory
  ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(file));

  // Extract frame at 1 second
  await ffmpeg.run(
    '-i', 'input.mp4',
    '-ss', '00:00:01',
    '-frames:v', '1',
    'thumbnail.jpg'
  );

  // Read the output file
  const data = ffmpeg.FS('readFile', 'thumbnail.jpg');

  // Convert to Blob
  return new File([data.buffer], 'thumbnail.jpg', { type: 'image/jpeg' });
}