/* ===================================================
   Mapeamento de Imagens Estáticas para o Vite
   ===================================================
   Utiliza `import.meta.glob` com `eager: true` para gerar URLs com hash
   de cada sprite `.webp` da pasta `/sprites/`. Isso garante pré-cache
   offline com hash e invalidação automática via Workbox e fallback
   síncrono para `sprite_unreal.webp` sem disparar requisições 404.
   =================================================== */

const spriteModules = import.meta.glob('/sprites/*.webp', { eager: true, import: 'default' });
const FALLBACK_SPRITE_KEY = '/sprites/sprite_unreal.webp';

/**
 * Retorna a URL processada pelo Vite para o sprite informado.
 * Se a imagem específica ainda não existir no diretório `/sprites/`,
 * retorna automaticamente a imagem padrão `sprite_unreal.webp`.
 * @param {string} spriteId - ID do sprite (ex.: "water_basic")
 * @returns {string} URL da imagem .webp
 */
export function getSpriteImageUrl(spriteId) {
    if (!spriteId) return '';
    const key = `/sprites/${spriteId}.webp`;
    const match = spriteModules[key];
    if (typeof match === 'string') {
        return match;
    }
    const fallback = spriteModules[FALLBACK_SPRITE_KEY];
    return typeof fallback === 'string' ? fallback : 'sprites/sprite_unreal.webp';
}

/**
 * Retorna a URL do ícone principal da marca (favicon.webp).
 * @returns {string} URL da imagem
 */
export function getMascotImageUrl() {
    return 'favicon.webp';
}
