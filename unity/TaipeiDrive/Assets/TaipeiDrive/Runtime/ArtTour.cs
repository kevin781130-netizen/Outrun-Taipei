using UnityEngine;

namespace TaipeiDrive
{
    // Presentation-only reference tour. This does not replace the driving simulation.
    public sealed class ArtTour : MonoBehaviour
    {
        public float duration = 60f;
        public float distance = 690f;
        private float elapsed;
        private Vector3 origin;
        private Camera view;

        private void Awake() { origin = transform.position; view = GetComponent<Camera>(); }
        private void Update()
        {
            elapsed = Mathf.Min(duration, elapsed + Time.deltaTime);
            transform.position = origin + Vector3.forward * (distance * elapsed / duration);
            // No camera shake or oscillating FOV: judge material and scale clearly.
            if (view != null) view.fieldOfView = 62f;
        }
        private void OnGUI()
        {
            GUI.Box(new Rect(12, 12, 355, 52),
                "TAIPEI / SUNSET ART STUDY\n60s camera tour - driving not ported");
            if (elapsed >= duration && GUI.Button(new Rect(12, 70, 120, 32), "Replay tour")) elapsed = 0;
        }
    }
}
