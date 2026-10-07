using System;
using System.IO;
using Taipei;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;

namespace Taipei.Editor
{
    public static class ArtPreviewSetup
    {
        const string ScenePath="Assets/Taipei/Scenes/ArtPreview.unity";
        const string ProfilePath="Assets/Taipei/Resources/RetroArt.asset";
        [MenuItem("Taipei/Create Art Preview")]
        public static void CreatePreview()
        {
            // Keep hand-edited scene data safe. Building never regenerates an existing scene.
            if(File.Exists(ScenePath)){EditorSceneManager.OpenScene(ScenePath);return;}
            if(!Application.isBatchMode&&!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())return;
            Configure();
            Directory.CreateDirectory("Assets/Taipei/Scenes");AssetDatabase.Refresh();
            var profile=AssetDatabase.LoadAssetAtPath<RetroArtProfile>(ProfilePath);
            if(!profile){profile=ScriptableObject.CreateInstance<RetroArtProfile>();AssetDatabase.CreateAsset(profile,ProfilePath);}
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene,NewSceneMode.Single);
            var clear=new GameObject("Black letterbox clear").AddComponent<Camera>();
            clear.depth=-1;clear.cullingMask=0;clear.clearFlags=CameraClearFlags.SolidColor;clear.backgroundColor=Color.black;
            clear.allowHDR=false;clear.allowMSAA=false;
            var world=new GameObject("Batched Taipei scenery").AddComponent<TaipeiWorld>();
            var worldCamera=new GameObject("Retro world camera").AddComponent<Camera>();
            worldCamera.tag="MainCamera";worldCamera.depth=0;worldCamera.nearClipPlane=.1f;worldCamera.farClipPlane=500;
            worldCamera.allowHDR=false;worldCamera.allowMSAA=false;worldCamera.clearFlags=CameraClearFlags.Skybox;
            var output=new GameObject("Point-filtered output").AddComponent<Camera>();
            output.depth=1;output.cullingMask=0;output.clearFlags=CameraClearFlags.SolidColor;output.backgroundColor=Color.black;
            output.allowHDR=false;output.allowMSAA=false;
            var presenter=output.gameObject.AddComponent<RetroPresenter>();presenter.worldCamera=worldCamera;presenter.profile=profile;
            var game=new GameObject("Art validation racer").AddComponent<ArtPreviewGame>();
            game.artProfile=profile;game.worldCamera=worldCamera;game.world=world;
            EditorSceneManager.SaveScene(EditorSceneManager.GetActiveScene(),ScenePath);
            EditorBuildSettings.scenes=new[]{new EditorBuildSettingsScene(ScenePath,true)};
            AssetDatabase.SaveAssets();
        }
        [MenuItem("Taipei/Apply Retro Web Settings")]
        public static void Configure()
        {
            PlayerSettings.companyName="Taipei Sunset Drive";PlayerSettings.productName="Taipei Sunset Drive - Art Study";
            PlayerSettings.colorSpace=ColorSpace.Gamma;
            PlayerSettings.runInBackground=false;PlayerSettings.defaultScreenWidth=960;PlayerSettings.defaultScreenHeight=540;
            PlayerSettings.SetScriptingBackend(NamedBuildTarget.WebGL,ScriptingImplementation.IL2CPP);
            PlayerSettings.WebGL.compressionFormat=WebGLCompressionFormat.Gzip;
            PlayerSettings.WebGL.decompressionFallback=true;PlayerSettings.WebGL.dataCaching=true;
            PlayerSettings.WebGL.initialMemorySize=128;PlayerSettings.WebGL.maximumMemorySize=512;
            QualitySettings.antiAliasing=0;QualitySettings.shadows=ShadowQuality.Disable;
            QualitySettings.vSyncCount=0;QualitySettings.pixelLightCount=0;
            // Built-in renderer intentionally supports the lightweight palette presenter.
            GraphicsSettings.defaultRenderPipeline=null;QualitySettings.renderPipeline=null;
            Time.fixedDeltaTime=1f/60;Time.maximumDeltaTime=.1f;
        }
        [MenuItem("Taipei/Build Web Art Preview")]
        public static void BuildWeb()
        {
            CreatePreview();Configure();
            Directory.CreateDirectory("Builds/WebArtPreview");
            var report=BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes=new[]{ScenePath},locationPathName="Builds/WebArtPreview",target=BuildTarget.WebGL,options=BuildOptions.None
            });
            if(report.summary.result!=BuildResult.Succeeded)throw new InvalidOperationException("Web art-preview build failed: "+report.summary.result);
        }
    }
}
