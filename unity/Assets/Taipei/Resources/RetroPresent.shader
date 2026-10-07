Shader "Taipei/Retro Present"
{
    Properties { _MainTex("Frame", 2D)="white"{} _Steps("Steps", Float)=24 _Dither("Dither", Float)=.35 _Scanline("Scanline", Float)=.035 }
    SubShader
    {
        Cull Off ZWrite Off ZTest Always
        Pass
        {
            CGPROGRAM
            #pragma vertex vert_img
            #pragma fragment frag
            #include "UnityCG.cginc"
            sampler2D _MainTex; float4 _MainTex_TexelSize; float _Steps, _Dither, _Scanline;
            fixed4 frag(v2f_img i) : SV_Target
            {
                float2 p = floor(i.uv * _MainTex_TexelSize.zw);
                // Static 2x2 ordered dithering: no time/noise, no distracting shimmer.
                float threshold = (fmod(p.x,2)*2 + fmod(p.y,2)) / 4 - .375;
                float3 c = tex2D(_MainTex,i.uv).rgb;
                c = floor(saturate(c + threshold * _Dither / _Steps) * _Steps + .5) / _Steps;
                c *= 1 - fmod(p.y,2) * _Scanline;
                return fixed4(c,1);
            }
            ENDCG
        }
    }
    Fallback Off
}
