using System;
using UnityEngine;

namespace Taipei
{
    public sealed class TaipeiWorld : MonoBehaviour
    {
        public RoadPath Path { get; private set; }
        public Material Material { get; private set; }
        Mesh worldMesh;
        Material sky;
        RetroArtProfile profile;
        public void Build(RouteDefinition route, RetroArtProfile art)
        {
            profile = art;
            Path = new RoadPath(route);
            if (!Material)
            {
                Shader flat = Resources.Load<Shader>("RetroFlat");
                if (!flat || !flat.isSupported) throw new InvalidOperationException("RetroFlat shader unavailable.");
                Material = new Material(flat);
            }
            Material.SetColor("_Ambient",profile.neon?new Color(.4f,.49f,.7f):new Color(.6f,.67f,.72f));
            Material.SetColor("_Sun",profile.neon?new Color(.2f,.36f,.5f):new Color(1,.82f,.6f));
            if(!sky)sky=new Material(Resources.Load<Shader>("RetroSky"));
            sky.SetColor("_Sky",profile.Sky);sky.SetColor("_Horizon",profile.Horizon);sky.SetFloat("_Neon",profile.neon?1:0);
            RenderSettings.skybox=sky;RenderSettings.fog=true;RenderSettings.fogMode=FogMode.Linear;
            RenderSettings.fogColor=profile.Horizon;RenderSettings.fogStart=60;RenderSettings.fogEnd=profile.fogEnd;
            var mesh = new ArtMesh();
            bool mountain=route.archetype=="mountain",water=route.archetype=="coastal",elevated=route.archetype=="expressway";
            Color ground=profile.neon?new Color(.055f,.12f,.14f):mountain?new Color(.25f,.4f,.27f):new Color(.35f,.43f,.38f);
            for(int i=0;i<Path.Centers.Length-1;i++)
            {
                Path.Sample(i*RoadPath.Spacing,out Vector3 a,out Vector3 ra,out Quaternion qa,out _);
                Path.Sample((i+1)*RoadPath.Spacing,out Vector3 b,out Vector3 rb,out _,out _);
                Strip(mesh,a,ra,b,rb,-RoadPath.HalfWidth,RoadPath.HalfWidth,.015f,profile.road*(i%2==0?1:1.05f));
                Strip(mesh,a,ra,b,rb,-10,-9,.03f,i%2==0?profile.cream:profile.magenta);
                Strip(mesh,a,ra,b,rb,9,10,.03f,i%2==0?profile.cream:profile.magenta);
                if(i%3!=0)foreach(float lane in new[]{-3f,3f})Strip(mesh,a,ra,b,rb,lane-.075f,lane+.075f,.04f,profile.cream);
                if(elevated)
                {
                    Strip(mesh,a,ra,b,rb,-12,-10,0,ground);Strip(mesh,a,ra,b,rb,10,12,0,ground);
                    mesh.Beam(a-ra*10.5f+Vector3.up*.7f,b-rb*10.5f+Vector3.up*.7f,.22f,profile.cream);
                    mesh.Beam(a+ra*10.5f+Vector3.up*.7f,b+rb*10.5f+Vector3.up*.7f,.22f,profile.cream);
                    Strip(mesh,a-Vector3.up*12,ra,b-Vector3.up*12,rb,-180,180,0,ground);
                }
                else
                {
                    Strip(mesh,a,ra,b,rb,-180,-10,-.08f,water?profile.teal*.5f:ground);
                    Strip(mesh,a,ra,b,rb,10,180,-.08f,ground);
                }
                if(i%5==0)
                {
                    int side=i%10==0?1:-1;
                    if(water&&side<0)continue; // no buildings on the river
                    float height=6+Hash(i+route.seed)*16;
                    Vector3 anchor=a+ra*side*(elevated?35:22);
                    if(mountain) Tree(mesh,anchor,4+height*.25f);
                    else Shop(mesh,anchor,qa,height,i+route.seed);
                }
                if(i%8==0&&!mountain)
                {
                    Vector3 pole=a+ra*11.7f;
                    mesh.Box(pole+Vector3.up*3.5f,new Vector3(.15f,7,.15f),profile.cream*.5f);
                    mesh.Box(pole+Vector3.up*7-ra*1.5f,new Vector3(3,.15f,.35f),profile.warm,qa);
                }
            }
            // Landmark silhouettes stay outside the drive envelope; no collision from art.
            for(int k=0;k<3;k++)
            {
                float distance=Path.Length*(.2f+k*.3f);
                Path.Sample(distance,out Vector3 p,out Vector3 right,out _,out _);
                Landmark(mesh,p+right*(water||k%2==0?48:-48),route,k);
            }
            // Original compact start/finish/checkpoint gantries.
            foreach(float distance in new[]{50f,Path.Length*.5f,Path.Length})
            {
                Path.Sample(distance,out Vector3 p,out Vector3 right,out Quaternion q,out _);
                mesh.Box(p-right*11+Vector3.up*4,new Vector3(.6f,8,.6f),profile.cream,q);
                mesh.Box(p+right*11+Vector3.up*4,new Vector3(.6f,8,.6f),profile.cream,q);
                mesh.Box(p+Vector3.up*8,new Vector3(23,1.5f,.6f),profile.teal*.65f,q);
                for(int j=-9;j<=9;j+=2)mesh.Box(p+right*j+Vector3.up*8.2f,new Vector3(1,.2f,.7f),profile.cream,q);
            }
            var filter=GetComponent<MeshFilter>();if(!filter)filter=gameObject.AddComponent<MeshFilter>();
            var renderer=GetComponent<MeshRenderer>();if(!renderer)renderer=gameObject.AddComponent<MeshRenderer>();
            if(worldMesh)Destroy(worldMesh);worldMesh=mesh.Build(route.id+" batched scenery");
            filter.sharedMesh=worldMesh;renderer.sharedMaterial=Material;
            renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;
        }
        static float Hash(int n) { uint h=(uint)n*747796405u+2891336453u;h=((h>>((int)(h>>28)+4))^h)*277803737u;return ((h>>22)^h)/(float)uint.MaxValue; }
        static void Strip(ArtMesh m,Vector3 a,Vector3 ra,Vector3 b,Vector3 rb,float left,float right,float y,Color color)
            => m.Quad(a+ra*left+Vector3.up*y,b+rb*left+Vector3.up*y,b+rb*right+Vector3.up*y,a+ra*right+Vector3.up*y,color);
        void Tree(ArtMesh m,Vector3 p,float h)
        {
            m.Box(p+Vector3.up*h*.35f,new Vector3(.55f,h*.7f,.55f),new Color(.3f,.22f,.19f));
            for(int j=0;j<3;j++)m.Box(p+Vector3.up*(h*.55f+j*h*.16f),new Vector3(h*(.6f-j*.13f),h*.25f,h*(.6f-j*.13f)),profile.teal*(.5f+j*.07f));
        }
        void Shop(ArtMesh m,Vector3 p,Quaternion q,float height,int seed)
        {
            Color wall=Color.Lerp(profile.cream,profile.teal,Hash(seed));
            m.Box(p+Vector3.up*height*.5f,new Vector3(9,height,10),wall*.7f,q);
            m.Box(p+q*new Vector3(0,2.4f,-5.1f),new Vector3(8,1,.25f),seed%2==0?profile.magenta:profile.teal,q);
            m.Box(p+q*new Vector3(0,1.8f,-5.6f),new Vector3(9,.2f,2),profile.cream,q);
            for(int floor=4;floor<height-1;floor+=3)for(int x=-3;x<=3;x+=3)
            {
                Color light=profile.neon&&Hash(seed+floor+x)>.4f?profile.warm:new Color(.16f,.3f,.39f);
                m.Box(p+q*new Vector3(x,floor,-5.05f),new Vector3(1.2f,1.3f,.15f),light,q);
            }
            m.Box(p+q*new Vector3(2,height+1,1),new Vector3(1.8f,2,2.2f),profile.cream*.7f,q);
        }
        void Landmark(ArtMesh m,Vector3 p,RouteDefinition r,int variant)
        {
            // Fifteen independently constructed art studies, using the reference route's identity.
            switch(r.id)
            {
                case "4D":case "5D": Tower(m,p);break;
                case "2A": Palace(m,p,1);break;
                case "1A": Palace(m,p,0);break;
                case "3B": if(variant==1)Palace(m,p,2);else Wheel(m,p);break;
                case "3C": Dome(m,p);break;
                case "3A": if(variant==1)Bridge(m,p,false);else Hills(m,p,true);break;
                case "4A": m.Box(p+Vector3.up*7,new Vector3(24,14,17),profile.magenta*.7f);Palace(m,p+Vector3.right*22,2);break;
                case "4B": Hills(m,p,true);break;
                case "4C": if(variant==1)Bridge(m,p,false);else Offices(m,p);break;
                case "5A": Bridge(m,p,true);break;
                case "5B": Lighthouse(m,p);break;
                case "5C": LanternTown(m,p);break;
                case "5E": Gondola(m,p);break;
                default: Offices(m,p);break;
            }
        }
        void Tower(ArtMesh m,Vector3 p)
        {
            m.Box(p+Vector3.up*5,new Vector3(24,10,20),profile.teal*.6f);
            for(int j=0;j<8;j++)
            {
                float w=11-j*.35f,y=12+j*8;
                m.Box(p+Vector3.up*(y+3.3f),new Vector3(w,6.6f,w),profile.teal);
                m.Box(p+Vector3.up*(y+6.7f),new Vector3(w+1.3f,.5f,w+1.3f),profile.cream);
                for(int k=-3;k<=3;k+=2)m.Box(p+new Vector3(k,y+3,-w*.5f-.1f),new Vector3(.3f,4,.15f),profile.neon?profile.warm:profile.cream*.7f);
            }
            m.Box(p+Vector3.up*82,new Vector3(1.1f,17,1.1f),profile.cream);
        }
        void Palace(ArtMesh m,Vector3 p,int kind)
        {
            float h=kind==1?26:12;
            m.Box(p+Vector3.up*h*.5f,new Vector3(36,h,16),kind==0?profile.magenta*.7f:profile.cream);
            for(int y=3;y<h;y+=3)for(int x=-15;x<=15;x+=3)m.Box(p+new Vector3(x,y,-8.1f),new Vector3(1.1f,1.8f,.2f),profile.neon?profile.warm:new Color(.12f,.21f,.26f));
            for(int j=0;j<3;j++)m.Box(p+Vector3.up*(h+j*.75f),new Vector3(42-j*5,1,22-j*4),kind==1?profile.warm:profile.teal);
            if(kind==0)m.Box(p+Vector3.up*19,new Vector3(7,16,8),profile.cream);
        }
        void Wheel(ArtMesh m,Vector3 p)
        {
            var center=p+Vector3.up*24;
            m.Beam(p+Vector3.left*10,center,.8f,profile.cream);m.Beam(p+Vector3.right*10,center,.8f,profile.cream);
            for(int j=0;j<24;j++)
            {
                float a=j*Mathf.PI/12,b=(j+1)*Mathf.PI/12;
                Vector3 x=center+new Vector3(Mathf.Cos(a)*18,Mathf.Sin(a)*18,0),y=center+new Vector3(Mathf.Cos(b)*18,Mathf.Sin(b)*18,0);
                m.Beam(x,y,.35f,j%2==0?profile.teal:profile.magenta);
                if(j%2==0){m.Beam(center,x,.18f,profile.cream);m.Box(x-Vector3.up*1.2f,new Vector3(2,2.4f,2),profile.warm);}
            }
        }
        void Dome(ArtMesh m,Vector3 p)
        {
            m.Box(p+Vector3.up*3,new Vector3(48,6,35),profile.cream*.7f);
            for(int j=0;j<7;j++)m.Box(p+Vector3.up*(6+j),new Vector3(48-j*5,1.2f,35-j*3),profile.teal*(.8f+j*.03f));
        }
        void Bridge(ArtMesh m,Vector3 p,bool cable)
        {
            m.Box(p+Vector3.up*4,new Vector3(64,1.5f,7),profile.cream);
            for(int side=-1;side<=1;side+=2)
            {
                Vector3 mast=p+new Vector3(side*18,24,0);m.Beam(p+Vector3.right*side*18,mast,.8f,cable?profile.cream:profile.magenta);
                for(int j=0;j<5;j++)m.Beam(mast,p+new Vector3(side*(22+j*2),5,0),.12f,cable?profile.cream:profile.magenta);
            }
        }
        void Hills(ArtMesh m,Vector3 p,bool steam)
        {
            for(int j=0;j<5;j++)m.Box(p+new Vector3((j-2)*13,5+j%2*3,j*4),new Vector3(18,10+j%2*6,24),profile.teal*.5f);
            if(steam)for(int j=0;j<5;j++)m.Box(p+new Vector3(j*.9f,14+j*3,0),new Vector3(2+j,3,2+j),profile.cream*(.7f+j*.04f));
        }
        void Lighthouse(ArtMesh m,Vector3 p)
        {
            for(int j=0;j<7;j++)m.Box(p+Vector3.up*(2+j*3),new Vector3(5,3,5),j%2==0?profile.cream:new Color(.12f,.16f,.2f));
            m.Box(p+Vector3.up*23,new Vector3(7,2,7),profile.cream);m.Box(p+Vector3.up*25,new Vector3(3,3,3),profile.warm);
        }
        void LanternTown(ArtMesh m,Vector3 p)
        {
            for(int j=0;j<4;j++)
            {
                Vector3 a=p+new Vector3((j-2)*10,j*3,0);Palace(m,a,2);
                for(int k=-12;k<=12;k+=4)m.Box(a+new Vector3(k,8,-10),new Vector3(1.3f,2,1.3f),profile.magenta);
            }
        }
        void Gondola(ArtMesh m,Vector3 p)
        {
            Hills(m,p,false);
            Vector3 a=p+new Vector3(-25,28,0),b=p+new Vector3(25,34,0);
            m.Beam(a,b,.13f,profile.cream);m.Beam(a,a-Vector3.up*28,.8f,profile.cream);m.Beam(b,b-Vector3.up*34,.8f,profile.cream);
            for(int j=0;j<4;j++){Vector3 q=Vector3.Lerp(a,b,j/3f);m.Beam(q,q-Vector3.up*3,.1f,profile.cream);m.Box(q-Vector3.up*4.5f,new Vector3(3,3,2),profile.cream);}
        }
        void Offices(ArtMesh m,Vector3 p)
        {
            for(int j=0;j<4;j++)Shop(m,p+new Vector3((j-2)*14,0,j*3),Quaternion.identity,18+j*4,j*31);
        }
        void OnDestroy()
        {
            if(worldMesh)Destroy(worldMesh);if(Material)Destroy(Material);if(sky)Destroy(sky);
        }
    }
}
