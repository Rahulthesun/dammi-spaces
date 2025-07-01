# Media Uploader - Next.js 14 + Cloudflare R2

A modern, minimal media uploader web application built with Next.js 14 and Tailwind CSS. Upload images and videos directly to Cloudflare R2 storage with a beautiful drag-and-drop interface.

## Features

- 🎨 **Modern UI**: Clean, responsive design with Tailwind CSS
- 📁 **Drag & Drop**: Intuitive file upload interface
- 🖼️ **Media Support**: Upload images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG, MOV)
- ☁️ **Cloudflare R2**: Fast, reliable cloud storage
- 📱 **Mobile Friendly**: Responsive design that works on all devices
- ⚡ **Fast**: Built with Next.js 14 for optimal performance

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes
- **File Upload**: Formidable
- **Cloud Storage**: Cloudflare R2 (AWS S3-compatible)
- **Styling**: Tailwind CSS

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (version 18 or higher)
2. **npm** or **yarn**
3. **Cloudflare R2** account and bucket set up

## Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd mrgloss-media-uploader

# Install dependencies
npm install
# or
yarn install
```

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and add your Cloudflare R2 credentials:
   ```env
   R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
   R2_ACCESS_KEY=your-access-key-id
   R2_SECRET_KEY=your-secret-access-key
   R2_BUCKET_NAME=your-bucket-name
   NODE_ENV=development
   ```

### 3. Get Cloudflare R2 Credentials

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Create a new bucket or use an existing one
4. Go to **Manage R2 API tokens**
5. Create a new API token with the following permissions:
   - **Object Read & Write** for your bucket
6. Copy the **Account ID**, **Access Key ID**, and **Secret Access Key**

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
mrgloss-media-uploader/
├── pages/
│   ├── index.js          # Main upload page
│   ├── _app.js           # App wrapper
│   └── api/
│       └── upload.js     # Upload API endpoint
├── styles/
│   └── globals.css       # Global styles with Tailwind
├── package.json          # Dependencies and scripts
├── next.config.js        # Next.js configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
├── env.example           # Environment variables example
└── README.md            # This file
```

## API Endpoints

### POST `/api/upload`

Uploads a file to Cloudflare R2.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field

**Response:**
```json
{
  "success": true,
  "url": "https://your-bucket.your-account-id.r2.cloudflarestorage.com/filename.jpg",
  "filename": "filename.jpg",
  "size": 12345,
  "type": "image/jpeg"
}
```

## Deployment

### Deploy to Vercel

1. **Push to GitHub**: Push your code to a GitHub repository

2. **Connect to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click **New Project**
   - Import your GitHub repository
   - Select the repository

3. **Configure Environment Variables**:
   - In the Vercel project settings, go to **Environment Variables**
   - Add all the variables from your `.env.local` file:
     - `R2_ENDPOINT`
     - `R2_ACCESS_KEY`
     - `R2_SECRET_KEY`
     - `R2_BUCKET_NAME`

4. **Deploy**:
   - Click **Deploy**
   - Vercel will automatically build and deploy your application

### Deploy to Other Platforms

The application can be deployed to any platform that supports Next.js:

- **Netlify**: Use the Next.js build command
- **Railway**: Connect your GitHub repo
- **DigitalOcean App Platform**: Select Next.js as the framework

## Configuration

### File Size Limits

The default file size limit is 100MB. You can modify this in `pages/api/upload.js`:

```javascript
const form = formidable({
  maxFileSize: 100 * 1024 * 1024, // 100MB
  // ... other options
})
```

### Allowed File Types

Supported file types are defined in the upload handler:

```javascript
const allowedTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]
```

## Troubleshooting

### Common Issues

1. **"Upload failed" error**:
   - Check your R2 credentials in `.env.local`
   - Ensure your R2 bucket exists and is accessible
   - Verify your API token has the correct permissions

2. **"Invalid file type" error**:
   - The file must be an image or video
   - Check the allowed file types list

3. **Large file uploads fail**:
   - Increase the `maxFileSize` limit in the API route
   - Check your R2 bucket's file size limits

### Development Tips

- Use `NODE_ENV=development` for detailed error messages
- Check the browser's Network tab for API request details
- Monitor the terminal for server-side error logs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the [Next.js documentation](https://nextjs.org/docs)
3. Check the [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/)
4. Open an issue in the repository

---

Built with ❤️ using Next.js 14 and Tailwind CSS 