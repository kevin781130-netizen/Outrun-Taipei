Shader "Taipei/Retro Sky"
{
    Properties { _Sky("Sky", Color)=(.18,.38,.53,1) _Horizon("Horizon", Color)=(.95,.65,.46,1) _Neon("Neon", Float)=0 }
    SubShader
    {
        Tags { "Queue"="Background" "RenderType"="Background" "PreviewType"="Skybox" }
        Cull Off ZWrite Off
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"
            fixed4 _Sky, _Horizon; float _Neon;
            struct V { float4 vertex:POSITION; };
            struct F { float4 pos:SV_POSITION; float3 direction:TEXCOORD0; };
            F vert(V v) { F o; o.pos=UnityObjectToClipPos(v.vertex); o.direction=v.vertex.xyz; return o; }
            fixed4 frag(F i):SV_Target
            {
                float3 d=normalize(i.direction);
                float h=saturate(d.y*2);
                float3 c=lerp(_Horizon.rgb,_Sky.rgb,floor(h*12)/12);
                float sun=step(.995,dot(d,normalize(float3(-.32,.24,1))));
                sun*=step(.22,frac(d.y*90));
                c=lerp(c,lerp(float3(1,.82,.42),float3(.7,.84,.94),_Neon),sun);
                return fixed4(c,1);
            }
            ENDCG
        }
    }
}
