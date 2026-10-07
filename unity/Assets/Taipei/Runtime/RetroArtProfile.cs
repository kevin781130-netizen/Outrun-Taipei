using UnityEngine;

namespace Taipei
{
    [CreateAssetMenu(menuName = "Taipei/Retro Art Profile")]
    public sealed class RetroArtProfile : ScriptableObject
    {
        [Range(320, 960)] public int internalWidth = 640;
        [Range(0, .12f)] public float scanlineStrength = .035f;
        [Range(8, 64)] public int colorSteps = 24;
        [Range(0, 1)] public float ditherStrength = .35f;
        [Range(100, 600)] public float fogEnd = 340;
        public bool neon;
        public Color sunsetSky = new Color(.18f, .38f, .53f);
        public Color sunsetHorizon = new Color(.95f, .65f, .46f);
        public Color neonSky = new Color(.025f, .05f, .14f);
        public Color neonHorizon = new Color(.17f, .19f, .34f);
        public Color road = new Color(.16f, .18f, .23f);
        public Color warm = new Color(1, .72f, .37f);
        public Color teal = new Color(.2f, .68f, .66f);
        public Color magenta = new Color(.84f, .27f, .44f);
        public Color cream = new Color(.9f, .84f, .68f);
        public Color Sky => neon ? neonSky : sunsetSky;
        public Color Horizon => neon ? neonHorizon : sunsetHorizon;
    }
}
