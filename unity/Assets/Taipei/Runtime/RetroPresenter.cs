using UnityEngine;

namespace Taipei
{
    [RequireComponent(typeof(Camera))]
    public sealed class RetroPresenter : MonoBehaviour
    {
        public Camera worldCamera;
        public RetroArtProfile profile;
        RenderTexture frame;
        Material present;
        Camera output;
        void OnEnable()
        {
            output = GetComponent<Camera>();
            var shader = Resources.Load<Shader>("RetroPresent");
            if (shader && shader.isSupported) present = new Material(shader);
            Resize();
        }
        void Resize()
        {
            if (!worldCamera || !profile) return;
            int width = Mathf.Clamp(profile.internalWidth / 16, 20, 60) * 16;
            int height = width * 9 / 16;
            if (frame && frame.width == width && frame.height == height) return;
            if (frame) { worldCamera.targetTexture = null; frame.Release(); Destroy(frame); }
            frame = new RenderTexture(width, height, 24, RenderTextureFormat.ARGB32)
            { name = "Retro World Frame", filterMode = FilterMode.Point, antiAliasing = 1, useMipMap = false };
            frame.Create(); worldCamera.targetTexture = frame; worldCamera.aspect = 16f / 9;
        }
        void LateUpdate()
        {
            Resize();
            float ratio = (float)Screen.width / Mathf.Max(1, Screen.height);
            output.rect = ratio > 16f/9
                ? new Rect((1 - 16f/9/ratio)/2, 0, 16f/9/ratio, 1)
                : new Rect(0, (1 - ratio/(16f/9))/2, 1, ratio/(16f/9));
        }
        void OnRenderImage(RenderTexture source, RenderTexture destination)
        {
            if (!frame) { Graphics.Blit(source, destination); return; }
            if (!present) { Graphics.Blit(frame, destination); return; }
            present.SetFloat("_Steps", profile.colorSteps);
            present.SetFloat("_Dither", profile.ditherStrength);
            present.SetFloat("_Scanline", profile.scanlineStrength);
            Graphics.Blit(frame, destination, present);
        }
        void OnDisable()
        {
            if (worldCamera) worldCamera.targetTexture = null;
            if (frame) { frame.Release(); Destroy(frame); frame = null; }
            if (present) { Destroy(present); present = null; }
        }
    }
}
