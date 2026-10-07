Shader "Taipei/Retro Flat"
{
    Properties { _Ambient("Ambient", Color) = (.45,.5,.6,1) _Sun("Sun", Color) = (1,.8,.55,1) }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "UnityCG.cginc"
            fixed4 _Ambient, _Sun;
            struct Input { float4 vertex : POSITION; float3 normal : NORMAL; fixed4 color : COLOR; };
            struct Output { float4 pos : SV_POSITION; fixed4 color : COLOR; UNITY_FOG_COORDS(0) };
            Output vert(Input v)
            {
                Output o; o.pos = UnityObjectToClipPos(v.vertex);
                float3 n = UnityObjectToWorldNormal(v.normal);
                float light = floor(saturate(dot(n, normalize(float3(-.4,.8,-.45)))) * 3 + .5) / 3;
                o.color = fixed4(v.color.rgb * (_Ambient.rgb + _Sun.rgb * light * .55), 1);
                UNITY_TRANSFER_FOG(o, o.pos); return o;
            }
            fixed4 frag(Output i) : SV_Target { fixed4 c = i.color; UNITY_APPLY_FOG(i.fogCoord,c); return c; }
            ENDCG
        }
    }
}
