const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const User = require('../models/User');

const imagesDir = path.join(__dirname, '../public/images');
fs.mkdir(imagesDir, { recursive: true }).catch(console.error);

router.get('/', (req, res) => {
  const guestGenerations = req.session.guestGenerations;
  const tempImages = req.session.tempImages || [];
  res.render('index', { user: req.user, guestGenerations, tempImages });
});

router.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  const HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
  const MAX_GUEST_GENERATIONS = 3;

  if (!req.user && req.session.guestGenerations >= MAX_GUEST_GENERATIONS) {
    req.flash('error_msg', `Jako neregistrovaný uživatel můžete vygenerovat pouze ${MAX_GUEST_GENERATIONS} obrázky. Pro neomezené generování se prosím zaregistrujte.`);
    return res.redirect('/');
  }

  if (!prompt) {
    req.flash('error_msg', 'Zadejte prosím textový popis pro obrázek.');
    return res.redirect('/');
  }

  try {
    const response = await axios({
      url: `https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
        // Zde je nová a opravená hlavička Accept
        'Accept': 'image/png'
      },
      data: { inputs: prompt },
      responseType: 'arraybuffer',
      timeout: 120000,
    });

    if (!response.data || response.data.length === 0) {
      req.flash('error_msg', 'API nevrátilo platná data. Zkuste to prosím znovu.');
      return res.redirect('/');
    }

    const imageBuffer = Buffer.from(response.data);
    const fileName = `ai_image_${Date.now()}.png`;
    const filePath = path.join(imagesDir, fileName);

    await fs.writeFile(filePath, imageBuffer);
    const imageUrl = `/images/${fileName}`;

    if (req.user) {
      req.user.generatedImages.push({ prompt, imageUrl });
      await req.user.save();
    } else {
      req.session.guestGenerations++;
      if (!req.session.tempImages) {
        req.session.tempImages = [];
      }
      req.session.tempImages.push({ prompt, imageUrl });
    }

    req.flash('success_msg', 'Obrázek byl úspěšně vygenerován!');
    res.redirect('/');
  } catch (error) {
    if (error.response?.data) {
      console.error('Chyba při generování obrázku:', error.response.data.toString());
      req.flash('error_msg', `API chyba: ${error.response.data.toString()}`);
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Chyba: Vypršel časový limit pro generování obrázku.');
      req.flash('error_msg', 'Generování obrázku trvá příliš dlouho. Zkuste to prosím znovu s jednodušším popisem.');
    } else {
      console.error('Neznámá chyba při generování obrázku:', error.message);
      req.flash('error_msg', 'Něco se pokazilo při generování obrázku. Zkuste to prosím znovu.');
    }
    res.redirect('/');
  }
});

module.exports = router;