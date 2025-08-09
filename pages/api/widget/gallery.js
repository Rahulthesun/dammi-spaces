import { verifyWidgetToken } from '../../../backend/utils/tokenUtils'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { token } = req.query
  if (!token) return res.status(400).send('Missing token')

  const userId = verifyWidgetToken(token)
  if (!userId) return res.status(403).send('Invalid token')

  const { data, error } = await supabase
    .from('images')
    .select('url, name')
    .eq('user_id', userId)
    .order('upload_date', { ascending: false })

  if (error) return res.status(500).send('Error fetching images')

  res.setHeader('Content-Type', 'application/javascript')

  res.send(`
    (function() {
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
    })();
  `)
}
