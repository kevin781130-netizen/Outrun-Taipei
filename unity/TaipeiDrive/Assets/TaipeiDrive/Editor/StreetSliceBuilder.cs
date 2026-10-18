using System;
using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace TaipeiDrive.Editor
{
    // Editor import only; the built player contains normal Unity meshes/materials.
    public static class StreetSliceBuilder
    {
        private const string Source = "Assets/Generated/Source/";
        private const string Output = "Assets/Generated/Slice/";
        private const string ScenePath = Output + "TaipeiSunset.unity";
        [Serializable] public class Model { public string name; public Part[] parts; public Surface[] materials; }
        [Serializable] public class Part { public int material; public Vector3[] vertices, normals; public Vector2[] uv; public int[] triangles; }
        [Serializable] public class Surface { public string name, texture; public float[] color; public float metallic, roughness; public bool transparent, doubleSided; }
        [Serializable] public class Palette { public string name, color; }
        [Serializable] public class Box { public string role, material; public float[] scale, position; }
        [Serializable] public class Sign { public string id, text, subtitle; public float[] size, position; }
        [Serializable] public class Style { public string style; public Palette[] palette; public Box[] nearBoxes, farBoxes; public Sign[] signs; }
        [Serializable] public class Styles { public Style[] styles; }

        private static Vector3 V(float[] a) => new Vector3(a[0], a[1], a[2]);
        private static T Read<T>(string file) => JsonUtility.FromJson<T>(File.ReadAllText(Source + file));

        [MenuItem("Taipei Drive/Generate sunset art slice")]
        public static void Generate()
        {
            if (!File.Exists(Source + "streetfront.json") || !File.Exists(Source + "Metal_Window.json"))
                throw new InvalidOperationException("Run both export-unity tools from the repository root first.");
            Directory.CreateDirectory(Output);
            AssetDatabase.Refresh();
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var models = new Dictionary<string, GameObject>();
            foreach (string name in new[] { "Metal_Window", "Brick_RedWhite_DoubleWindow", "DoorFrame_Trim", "Brick_Plain_1" })
                models.Add(name, ImportModel(name));
            var styles = Read<Styles>("streetfront.json").styles;
            if (styles == null || styles.Length != 3) throw new InvalidDataException("Expected three streetfront styles.");
            var prefabs = new List<GameObject>();
            foreach (var style in styles) prefabs.Add(CreateStreetfront(style, models));

            var asphalt = MakeMaterial("Road", new Color(.115f, .13f, .15f));
            var sidewalk = MakeMaterial("Pavement", new Color(.44f, .43f, .39f));
            var paint = MakeMaterial("LanePaint", new Color(.83f, .79f, .62f));
            var road = new GameObject("Street - metre scale / protected 16m carriageway");
            Cube("Asphalt", road.transform, new Vector3(0, -.18f, 370), new Vector3(16, .3f, 800), asphalt);
            for (int side = -1; side <= 1; side += 2)
            {
                Cube("Raised pavement", road.transform, new Vector3(side * 10.25f, -.06f, 370), new Vector3(4.5f, .3f, 800), sidewalk);
                Cube("Edge line", road.transform, new Vector3(side * 7.55f, -.018f, 370), new Vector3(.12f, .014f, 800), paint);
            }
            for (int z = -20; z < 770; z += 12)
                Cube("Centre dash", road.transform, new Vector3(0, -.018f, z), new Vector3(.13f, .014f, 4), paint);
            // Source accents face +Z. Rotate to face the street on each side.
            for (int i = 0; i < 62; i++)
            {
                int side = i % 2 == 0 ? -1 : 1;
                var instance = (GameObject)PrefabUtility.InstantiatePrefab(prefabs[(i / 2 + (side + 1)) % prefabs.Count]);
                instance.transform.SetPositionAndRotation(new Vector3(side * 13.8f, .09f, (i / 2) * 24f), Quaternion.Euler(0, -side * 90, 0));
            }
            var sunlight = new GameObject("Warm sunset key").AddComponent<Light>();
            sunlight.type = LightType.Directional;
            sunlight.transform.rotation = Quaternion.Euler(22, -35, 0);
            sunlight.color = new Color(1f, .77f, .53f);
            sunlight.intensity = 1.25f;
            sunlight.shadows = LightShadows.Soft;
            RenderSettings.sun = sunlight;
            RenderSettings.ambientMode = AmbientMode.Trilight;
            RenderSettings.ambientSkyColor = new Color(.46f, .58f, .72f);
            RenderSettings.ambientEquatorColor = new Color(.36f, .32f, .29f);
            RenderSettings.ambientGroundColor = new Color(.16f, .17f, .19f);
            RenderSettings.fog = true;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogColor = new Color(.66f, .59f, .52f);
            RenderSettings.fogStartDistance = 95;
            RenderSettings.fogEndDistance = 240;
            QualitySettings.shadowDistance = 60;
            var camera = new GameObject("Art tour camera").AddComponent<Camera>();
            camera.tag = "MainCamera";
            camera.transform.position = new Vector3(-3.4f, 2.1f, -8);
            camera.transform.rotation = Quaternion.Euler(2, 0, 0);
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = RenderSettings.fogColor;
            camera.nearClipPlane = .15f;
            camera.farClipPlane = 260;
            camera.gameObject.AddComponent<ArtTour>();
            camera.gameObject.AddComponent<AudioListener>();
            PlayerSettings.colorSpace = ColorSpace.Linear;
            PlayerSettings.companyName = "TaipeiDrive";
            PlayerSettings.productName = "Taipei Sunset Art Study";
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            AssetDatabase.SaveAssets();
            Debug.Log("Generated sunset street art scene. Visual verification still required.");
        }

        private static GameObject ImportModel(string name)
        {
            var data = Read<Model>(name + ".json");
            var root = new GameObject(name);
            var materials = new Material[data.materials.Length];
            for (int i = 0; i < materials.Length; i++)
            {
                var s = data.materials[i];
                var m = MakeMaterial(name + "_" + i, new Color(s.color[0], s.color[1], s.color[2], s.color[3]));
                m.SetFloat("_Metallic", s.metallic);
                m.SetFloat("_Glossiness", 1 - s.roughness);
                if (!string.IsNullOrEmpty(s.texture)) m.mainTexture = AssetDatabase.LoadAssetAtPath<Texture2D>(Source + s.texture);
                // Standard is one-sided. Duplicate back faces for double-sided glTF parts below.
                if (s.transparent)
                {
                    m.SetFloat("_Mode", 3);
                    m.SetOverrideTag("RenderType", "Transparent");
                    m.SetInt("_SrcBlend", (int)BlendMode.One);
                    m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
                    m.SetInt("_ZWrite", 0);
                    m.EnableKeyword("_ALPHAPREMULTIPLY_ON");
                    m.renderQueue = 3000;
                }
                materials[i] = m;
            }
            for (int i = 0; i < data.parts.Length; i++)
            {
                var p = data.parts[i];
                var mesh = new Mesh { name = name + "_" + i, indexFormat = IndexFormat.UInt32 };
                mesh.vertices = p.vertices; mesh.normals = p.normals; mesh.uv = p.uv; mesh.triangles = p.triangles;
                if (data.materials[p.material].doubleSided)
                {
                    int n = p.vertices.Length;
                    var vertices = new Vector3[n * 2]; var normals = new Vector3[n * 2]; var uv = new Vector2[n * 2];
                    Array.Copy(p.vertices, vertices, n); Array.Copy(p.vertices, 0, vertices, n, n);
                    Array.Copy(p.normals, normals, n); Array.Copy(p.uv, uv, n); Array.Copy(p.uv, 0, uv, n, n);
                    for (int v = 0; v < n; v++) normals[n + v] = -p.normals[v];
                    var indices = new int[p.triangles.Length * 2];
                    Array.Copy(p.triangles, indices, p.triangles.Length);
                    for (int t = 0; t < p.triangles.Length; t += 3)
                    {
                        int j = p.triangles.Length + t;
                        indices[j] = p.triangles[t] + n; indices[j + 1] = p.triangles[t + 2] + n; indices[j + 2] = p.triangles[t + 1] + n;
                    }
                    mesh.vertices = vertices; mesh.normals = normals; mesh.uv = uv; mesh.triangles = indices;
                }
                mesh.RecalculateBounds(); mesh.RecalculateTangents();
                string meshPath = Output + mesh.name + ".asset";
                var existing = AssetDatabase.LoadAssetAtPath<Mesh>(meshPath);
                if (existing == null) AssetDatabase.CreateAsset(mesh, meshPath);
                else
                {
                    EditorUtility.CopySerialized(mesh, existing);
                    UnityEngine.Object.DestroyImmediate(mesh);
                    mesh = existing;
                    EditorUtility.SetDirty(mesh);
                }
                var part = new GameObject("Surface " + i);
                part.transform.SetParent(root.transform, false);
                part.AddComponent<MeshFilter>().sharedMesh = mesh;
                part.AddComponent<MeshRenderer>().sharedMaterial = materials[p.material];
            }
            var prefab = PrefabUtility.SaveAsPrefabAsset(root, Output + name + ".prefab");
            UnityEngine.Object.DestroyImmediate(root);
            return prefab;
        }

        private static GameObject CreateStreetfront(Style style, Dictionary<string, GameObject> models)
        {
            var root = new GameObject("Taipei_" + style.style);
            var palette = new Dictionary<string, Material>();
            foreach (var p in style.palette)
            {
                if (!ColorUtility.TryParseHtmlString(p.color, out var c)) throw new InvalidDataException(p.color);
                palette.Add(p.name, MakeMaterial(style.style + "_" + p.name, c));
            }
            var glow = MakeMaterial(style.style + "_accentGlow", palette["accent"].color);
            glow.EnableKeyword("_EMISSION"); glow.SetColor("_EmissionColor", glow.color * .5f);
            palette.Add("accentGlow", glow);
            var near = new GameObject("Near - imported CC0 facade + Taipei details"); near.transform.SetParent(root.transform, false);
            var far = new GameObject("Far - silhouette"); far.transform.SetParent(root.transform, false);
            foreach (var detail in style.nearBoxes) Cube(detail.role, near.transform, V(detail.position), V(detail.scale), palette[detail.material]);
            foreach (var detail in style.farBoxes) Cube(detail.role, far.transform, V(detail.position), V(detail.scale), palette[detail.material]);
            foreach (var lod in new[] { near, far })
                Cube("Building mass", lod.transform, new Vector3(0, 4.5f, -3), new Vector3(10, 9, 6), palette["plaster"]);
            for (int floor = 0; floor < 3; floor++)
            for (int bay = -1; bay <= 1; bay += 2)
            {
                var model = (GameObject)PrefabUtility.InstantiatePrefab(models[style.style == "metal" ? "Metal_Window" : "Brick_RedWhite_DoubleWindow"]);
                model.transform.SetParent(near.transform, false);
                model.transform.localPosition = new Vector3(bay * 2.5f, floor * 3, .04f);
                model.transform.localScale = new Vector3(1.25f, 1, 1);
            }
            // Sign textures are optional; never substitute missing CJK glyphs with tofu.
            foreach (var sign in style.signs)
            {
                var texture = AssetDatabase.LoadAssetAtPath<Texture2D>(Source + style.style + "_" + sign.id + ".png");
                if (texture == null) { Debug.LogWarning("Sign lettering pending: " + sign.text); continue; }
                string signPath = Output + style.style + "_sign_" + sign.id + ".mat";
                var material = AssetDatabase.LoadAssetAtPath<Material>(signPath);
                if (material == null)
                {
                    material = new Material(Shader.Find("Unlit/Texture"));
                    AssetDatabase.CreateAsset(material, signPath);
                }
                material.mainTexture = texture;
                var plane = GameObject.CreatePrimitive(PrimitiveType.Quad); plane.name = sign.text;
                plane.transform.SetParent(near.transform, false); plane.transform.localPosition = V(sign.position);
                plane.transform.localRotation = Quaternion.Euler(0, 180, 0);
                plane.transform.localScale = new Vector3(sign.size[0], sign.size[1], 1);
                UnityEngine.Object.DestroyImmediate(plane.GetComponent<Collider>());
                plane.GetComponent<MeshRenderer>().sharedMaterial = material;
            }
            var group = root.AddComponent<LODGroup>();
            group.SetLODs(new[] { new LOD(.12f, near.GetComponentsInChildren<Renderer>()), new LOD(.015f, far.GetComponentsInChildren<Renderer>()) });
            group.RecalculateBounds();
            var result = PrefabUtility.SaveAsPrefabAsset(root, Output + root.name + ".prefab");
            UnityEngine.Object.DestroyImmediate(root);
            return result;
        }

        private static Material MakeMaterial(string name, Color color)
        {
            string path = Output + name + ".mat";
            var m = AssetDatabase.LoadAssetAtPath<Material>(path);
            if (m == null) { m = new Material(Shader.Find("Standard")); AssetDatabase.CreateAsset(m, path); }
            m.color = color; m.enableInstancing = true;
            m.SetFloat("_Glossiness", .15f);
            return m;
        }
        private static void Cube(string name, Transform parent, Vector3 position, Vector3 scale, Material material)
        {
            var cube = GameObject.CreatePrimitive(PrimitiveType.Cube); cube.name = name;
            cube.transform.SetParent(parent, false); cube.transform.localPosition = position; cube.transform.localScale = scale;
            UnityEngine.Object.DestroyImmediate(cube.GetComponent<Collider>());
            cube.GetComponent<Renderer>().sharedMaterial = material;
        }
        [MenuItem("Taipei Drive/Build sunset slice for WebGL")]
        public static void BuildWebGL()
        {
            Generate();
            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                scenes = new[] { ScenePath }, locationPathName = "Builds/WebGL-ArtSlice", target = BuildTarget.WebGL,
                options = BuildOptions.Development });
            if (report.summary.result != BuildResult.Succeeded) throw new Exception("WebGL build failed: " + report.summary.result);
        }
    }
}
