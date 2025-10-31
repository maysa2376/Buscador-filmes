// Definição da imagem placeholder em base64
const PLACEHOLDER_IMAGE = `data:image/svg+xml;utf8,` +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'>` +
      `<rect width='100%' height='100%' fill='%23ddd'/>` +
      `<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23666' font-size='20'>Sem imagem</text>` +
    `</svg>`
  );

export { PLACEHOLDER_IMAGE };