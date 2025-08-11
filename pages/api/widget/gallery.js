import { verifyWidgetToken } from '../../../lib/tokenUtils';
import { createClient } from '@supabase/supabase-js';
import { isDomainAllowed } from '../../../lib/isDomainAllowed.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  const userId = verifyWidgetToken(token);
  if (!userId) return res.status(403).send('Invalid token');

  // Extract origin/referer
  const referer = req.headers.referer || '';
  let origin;
  try {
    origin = new URL(referer).origin;
  } catch {
    return res.status(400).send('// Invalid referer header');
  }

  // Domain allow check
  const allowed = await isDomainAllowed(userId, origin);
  if (!allowed) {
    return res.status(403).send('// Domain not allowed for this business');
  }

  // Fetch images (requires RLS setup to allow userId access)
  const { data, error } = await supabase
    .from('images')
    .select('url, name , thumbnail')
    .eq('user_id', userId)
    .order('upload_date', { ascending: false });

  console.log(data)

  if (error) return res.status(500).send('Error fetching images');

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    window.dammiImages = ${JSON.stringify(data)};
  `);
}

/*(function() {
      const images = ${JSON.stringify(data)};
      const container = document.getElementById('dammi-image-gallery');
      if (!container) return;

      container.style.display = 'grid';
      container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
      container.style.gap = '16px';

      images.forEach(img => {
        const wrapper = document.createElement('div');
        wrapper.style.border = '1px solid #ccc';
        wrapper.style.borderRadius = '8px';
        wrapper.style.overflow = 'hidden';
        wrapper.style.boxShadow = '0 2px 6px rgba(0,0,0,0.1)';
        wrapper.style.background = '#fff';

        const image = document.createElement('img');
        image.src = img.url;
        image.alt = img.name || 'image';
        image.style.width = '100%';
        image.style.display = 'block';

        wrapper.appendChild(image);
        container.appendChild(wrapper);
      });
    })();*/