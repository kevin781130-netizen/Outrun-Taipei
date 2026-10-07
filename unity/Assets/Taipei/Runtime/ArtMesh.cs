using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace Taipei
{
    // Vertex-coloured mesh batches replace thousands of primitive GameObjects/materials.
    public sealed class ArtMesh
    {
        readonly List<Vector3> vertices = new List<Vector3>();
        readonly List<Vector3> normals = new List<Vector3>();
        readonly List<Color> colors = new List<Color>();
        readonly List<int> triangles = new List<int>();
        public void Quad(Vector3 a, Vector3 b, Vector3 c, Vector3 d, Color color)
        {
            int n = vertices.Count;
            Vector3 normal = Vector3.Cross(b - a, c - a).normalized;
            vertices.Add(a); vertices.Add(b); vertices.Add(c); vertices.Add(d);
            for (int j = 0; j < 4; j++) { normals.Add(normal); colors.Add(color); }
            triangles.Add(n); triangles.Add(n + 1); triangles.Add(n + 2);
            triangles.Add(n); triangles.Add(n + 2); triangles.Add(n + 3);
        }
        public void Box(Vector3 center, Vector3 size, Color color, Quaternion rotation)
        {
            Vector3 h = size * .5f;
            Vector3 a = center + rotation * new Vector3(-h.x,-h.y,-h.z), b = center + rotation * new Vector3(h.x,-h.y,-h.z);
            Vector3 c = center + rotation * new Vector3(h.x,h.y,-h.z), d = center + rotation * new Vector3(-h.x,h.y,-h.z);
            Vector3 e = center + rotation * new Vector3(-h.x,-h.y,h.z), f = center + rotation * new Vector3(h.x,-h.y,h.z);
            Vector3 g = center + rotation * new Vector3(h.x,h.y,h.z), k = center + rotation * new Vector3(-h.x,h.y,h.z);
            Quad(a,d,c,b,color); Quad(f,g,k,e,color); Quad(e,k,d,a,color); Quad(b,c,g,f,color);
            Quad(d,k,g,c,color); Quad(e,a,b,f,color);
        }
        public void Box(Vector3 center, Vector3 size, Color color) => Box(center,size,color,Quaternion.identity);
        public void Beam(Vector3 a, Vector3 b, float width, Color color)
            => Box((a+b)*.5f,new Vector3(width,width,Vector3.Distance(a,b)),color,Quaternion.LookRotation(b-a));
        public Mesh Build(string name)
        {
            var mesh = new Mesh { name=name, indexFormat = vertices.Count > 65535 ? IndexFormat.UInt32 : IndexFormat.UInt16 };
            mesh.SetVertices(vertices); mesh.SetNormals(normals); mesh.SetColors(colors); mesh.SetTriangles(triangles,0);
            mesh.RecalculateBounds(); return mesh;
        }
        public static Mesh Car(Color paint, bool bus = false)
        {
            var b = new ArtMesh();
            var dark = new Color(.035f,.06f,.09f);
            b.Box(new Vector3(0,.55f,0),new Vector3(1.85f,.65f,bus ? 7 : 4.2f),paint);
            b.Box(new Vector3(0,bus?1.6f:1.12f,bus?0:.2f),new Vector3(1.5f,bus?1.6f:.58f,bus?6:1.65f),dark);
            b.Box(new Vector3(0,bus?2.5f:1.45f,.1f),new Vector3(1.6f,.1f,bus?6.5f:1.8f),paint);
            b.Box(new Vector3(0,.55f,bus?-3.55f:-2.15f),new Vector3(1.7f,.16f,.08f),new Color(.98f,.24f,.19f));
            b.Box(new Vector3(0,.5f,bus?3.55f:2.15f),new Vector3(1.6f,.12f,.08f),new Color(1,.94f,.67f));
            for(int side=-1;side<=1;side+=2)for(int end=-1;end<=1;end+=2)
                b.Box(new Vector3(side*.96f,.28f,end*(bus?2.35f:1.32f)),new Vector3(.23f,.55f,.7f),dark);
            // Grounding blob drawn geometrically, no real-time shadow map required.
            b.Quad(new Vector3(-1.1f,.035f,-2.45f),new Vector3(-1.1f,.035f,2.45f),new Vector3(1.1f,.035f,2.45f),new Vector3(1.1f,.035f,-2.45f),dark);
            return b.Build(bus?"Original coach":"Original roadster");
        }
    }
}
