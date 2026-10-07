using System;
using UnityEngine;

namespace Taipei
{
    [Serializable]
    public sealed class RouteDefinition
    {
        public string id, name, eng, theme, archetype, landmark, reality;
        public int seed, level, column, traffic, timeBudget;
        public float hills, difficulty, lengthMeters;
        public float[] curves;
    }

    [Serializable]
    public sealed class RouteCatalog
    {
        public string version;
        public RouteDefinition[] routes;
        public static RouteCatalog Load()
        {
            var asset = Resources.Load<TextAsset>("LegacyRoutes");
            if (!asset) throw new InvalidOperationException("LegacyRoutes.json is required.");
            var catalog = JsonUtility.FromJson<RouteCatalog>(asset.text);
            if (catalog?.routes == null || catalog.routes.Length != 15)
                throw new InvalidOperationException("Expected fifteen legacy reference routes.");
            return catalog;
        }
    }

    // Road-space position separates the collision envelope from visual body yaw.
    // This is a new migration model, not a claim of identical legacy physics.
    public sealed class RoadPath
    {
        public const float HalfWidth = 9f;
        public const float Spacing = 8f;
        public readonly Vector3[] Centers;
        public readonly float[] Headings, Curvatures;
        public readonly float Length;
        public RoadPath(RouteDefinition route)
        {
            if (route == null || route.lengthMeters <= 0 || route.curves == null || route.curves.Length < 2)
                throw new ArgumentException("Route requires length and at least two curve keys.");
            Length = route.lengthMeters;
            int count = Mathf.CeilToInt(Length / Spacing) + 80; // visible runway past finish
            Centers = new Vector3[count]; Headings = new float[count]; Curvatures = new float[count];
            float heading = 0;
            for (int i = 1; i < count; i++)
            {
                float s = i * Spacing;
                float progress = Mathf.Clamp01((s - 140) / Mathf.Max(1, Length - 300));
                float key = progress * (route.curves.Length - 1);
                int a = Mathf.Min(route.curves.Length - 2, Mathf.FloorToInt(key));
                float curve = Mathf.Lerp(route.curves[a], route.curves[a + 1], Mathf.SmoothStep(0, 1, key - a));
                if (s < 140 || s > Length - 140) curve = 0;
                Curvatures[i] = curve;
                heading += curve * Spacing * .00085f;
                Headings[i] = heading;
                Vector3 p = Centers[i - 1] + new Vector3(Mathf.Sin(heading), 0, Mathf.Cos(heading)) * Spacing;
                // Smooth bounded hills; no discontinuous jumps at the start or finish.
                p.y = Mathf.Sin(progress * Mathf.PI * 4) * Mathf.Sin(progress * Mathf.PI) * route.hills * .025f;
                Centers[i] = p;
            }
        }
        public void Sample(float distance, out Vector3 center, out Vector3 right, out Quaternion rotation, out float curve)
        {
            float index = Mathf.Clamp(distance / Spacing, 0, Centers.Length - 1.001f);
            int i = Mathf.FloorToInt(index); float t = index - i;
            center = Vector3.Lerp(Centers[i], Centers[i + 1], t);
            Vector3 forward = (Centers[i + 1] - Centers[i]).normalized;
            right = Vector3.Cross(Vector3.up, forward).normalized;
            rotation = Quaternion.LookRotation(forward, Vector3.up);
            curve = Mathf.Lerp(Curvatures[i], Curvatures[i + 1], t);
        }
    }
}
