using System;
using UnityEngine;

namespace Taipei
{
    // A playable art-validation track. The production legacy arcade remains the full game.
    public sealed class ArtPreviewGame : MonoBehaviour
    {
        public RetroArtProfile artProfile;
        public Camera worldCamera;
        public TaipeiWorld world;
        RouteCatalog catalog;
        RetroArtProfile art;
        DriveSimulation state;
        Transform player;
        Mesh playerMesh;
        Mesh[] trafficMeshes;
        TrafficCar[] traffic;
        int routeIndex;
        float accumulator;
        bool checkpoint;
        GUIStyle label, title, button;
        string message = "UNITY ART STUDY / V0.1";
        float messageUntil;
        const float FixedStep = 1f / 60;
        struct TrafficCar { public Transform view; public float distance, lane, speed; public bool bus; }

        void Awake()
        {
            if (!artProfile || !world || !worldCamera) { Debug.LogError("Generate the scene through Taipei > Create Art Preview."); enabled=false;return; }
            art=Instantiate(artProfile);
            // Presenter uses the same runtime clone; toggles do not dirty the serialized art asset.
            foreach(var presenter in FindObjectsByType<RetroPresenter>(FindObjectsSortMode.None))presenter.profile=art;
            catalog=RouteCatalog.Load();
            Application.targetFrameRate=60; QualitySettings.vSyncCount=0;
            Time.fixedDeltaTime=FixedStep;Time.maximumDeltaTime=.1f;
            QualitySettings.antiAliasing=0;QualitySettings.shadows=ShadowQuality.Disable;
            playerMesh=ArtMesh.Car(new Color(.87f,.16f,.22f));
            trafficMeshes=new[]{ArtMesh.Car(new Color(.96f,.72f,.22f)),ArtMesh.Car(new Color(.3f,.68f,.75f)),ArtMesh.Car(new Color(.82f,.81f,.73f),true)};
            player=View("Original player roadster",playerMesh);
            SetRoute(0);
        }
        Transform View(string name,Mesh mesh)
        {
            var obj=new GameObject(name);obj.transform.SetParent(transform,false);
            obj.AddComponent<MeshFilter>().sharedMesh=mesh;
            var renderer=obj.AddComponent<MeshRenderer>();
            renderer.shadowCastingMode=UnityEngine.Rendering.ShadowCastingMode.Off;renderer.receiveShadows=false;
            return obj.transform;
        }
        void SetRoute(int index)
        {
            bool automatic=state==null||state.Automatic;
            routeIndex=(index+catalog.routes.Length)%catalog.routes.Length;
            var route=catalog.routes[routeIndex];world.Build(route,art);
            state=new DriveSimulation(route.lengthMeters,route.timeBudget){Automatic=automatic};
            accumulator=0;checkpoint=false;message="3 · 2 · 1 / "+route.eng;
            messageUntil=Time.unscaledTime+4;
            if(traffic!=null)foreach(var car in traffic)if(car.view)Destroy(car.view.gameObject);
            traffic=new TrafficCar[route.traffic];
            var random=new System.Random(route.seed);
            for(int i=0;i<traffic.Length;i++)
            {
                int type=i%3;
                traffic[i]=new TrafficCar{view=View("Traffic "+i,trafficMeshes[type]),distance=90+i*(route.lengthMeters-180)/traffic.Length,lane=(i%3-1)*5f,speed=80+(float)random.NextDouble()*45,bus=type==2};
                traffic[i].view.GetComponent<MeshRenderer>().sharedMaterial=world.Material;
            }
            player.GetComponent<MeshRenderer>().sharedMaterial=world.Material;
            MoveViews();PositionCamera(true);
        }
        void Update()
        {
            if(state==null)return;
            if(Input.GetKeyDown(KeyCode.P)||Input.GetKeyDown(KeyCode.Escape))Pause();
            if(Input.GetKeyDown(KeyCode.R))SetRoute(routeIndex);
            if(Input.GetKeyDown(KeyCode.T))SetRoute(routeIndex+1);
            if(Input.GetKeyDown(KeyCode.M))ToggleMood();
            DriveInput input=ReadInput();
            if(state.Paused||state.Finished){accumulator=0;return;}
            accumulator+=Mathf.Min(Time.unscaledDeltaTime,.1f);
            while(accumulator>=FixedStep)
            {
                world.Path.Sample(state.Distance,out _,out _,out _,out float curve);
                float previousDistance=state.Distance,previousLateral=state.Lateral;
                bool racing=state.Countdown<=0&&state.CrashRemaining<=0;
                state.Step(FixedStep,input,curve);
                if(racing&&!state.Finished)StepTraffic(previousDistance,previousLateral);
                if(!checkpoint&&state.Distance>=world.Path.Length*.5f)
                {
                    checkpoint=true;state.TimeLeft+=10;message="CHECKPOINT +10 s";messageUntil=Time.unscaledTime+2;
                }
                accumulator-=FixedStep;
                if(state.Finished){accumulator=0;break;}
            }
            MoveViews();
        }
        void StepTraffic(float previousDistance,float previousLateral)
        {
            for(int i=0;i<traffic.Length;i++)
            {
                float previousCar=traffic[i].distance;
                traffic[i].distance+=traffic[i].speed/3.6f*FixedStep;
                if(traffic[i].distance>world.Path.Length+100){traffic[i].distance=30;continue;} // recycling is not a swept crossing
                // Relative swept interval catches fast boosts/reverse without render-dependent collisions.
                float from=previousCar-previousDistance,to=traffic[i].distance-state.Distance;
                bool longitudinal=Mathf.Min(from,to)<= (traffic[i].bus?5.7f:4.4f)&&Mathf.Max(from,to)>=-(traffic[i].bus?5.7f:4.4f);
                bool lateral=Mathf.Min(previousLateral,state.Lateral)<=traffic[i].lane+1.85f&&Mathf.Max(previousLateral,state.Lateral)>=traffic[i].lane-1.85f;
                if(longitudinal&&lateral&&Mathf.Abs(to)<30&&state.Speed>5)state.Crash();
            }
        }
        void MoveViews()
        {
            world.Path.Sample(state.Distance,out Vector3 p,out Vector3 right,out Quaternion q,out _);
            player.SetPositionAndRotation(p+right*state.Lateral+Vector3.up*.08f,q*Quaternion.Euler(0,state.BodyYaw,0));
            for(int i=0;i<traffic.Length;i++)
            {
                bool visible=Mathf.Abs(traffic[i].distance-state.Distance)<art.fogEnd+40;
                traffic[i].view.gameObject.SetActive(visible);
                if(!visible)continue;
                world.Path.Sample(traffic[i].distance,out Vector3 c,out Vector3 r,out Quaternion rotation,out _);
                traffic[i].view.SetPositionAndRotation(c+r*traffic[i].lane+Vector3.up*.08f,rotation);
            }
        }
        void LateUpdate(){if(state!=null)PositionCamera(false);}
        void PositionCamera(bool snap)
        {
            world.Path.Sample(Mathf.Max(0,state.Distance-10),out Vector3 p,out Vector3 right,out _,out _);
            world.Path.Sample(state.Distance+25,out Vector3 look,out Vector3 lookRight,out _,out _);
            Vector3 target=p+right*state.Lateral*.55f+Vector3.up*4.5f;
            if(state.Distance<10)target-=Vector3.forward*(10-state.Distance);
            worldCamera.transform.position=snap?target:Vector3.Lerp(worldCamera.transform.position,target,1-Mathf.Exp(-Time.unscaledDeltaTime*7));
            worldCamera.transform.rotation=Quaternion.LookRotation(look+lookRight*state.Lateral*.35f+Vector3.up*1.8f-worldCamera.transform.position,Vector3.up);
            worldCamera.fieldOfView=54; // stable horizon; no camera shake/roll/FOV pumping
        }
        void Pause()
        {
            if(state.Finished)return;
            state.Paused=!state.Paused;state.ReleaseInputs();accumulator=0;
        }
        void OnApplicationFocus(bool focused){if(!focused&&state!=null&&!state.Finished){state.Paused=true;state.ReleaseInputs();accumulator=0;}}
        void OnApplicationPause(bool paused){if(paused)OnApplicationFocus(false);}
        void ToggleMood(){art.neon=!art.neon;world.Build(catalog.routes[routeIndex],art);}
        float UiScale=>Mathf.Max(.1f,Screen.width/960f);
        float UiHeight=>Screen.height/UiScale;
        Rect Control(int index)=>new Rect(12+index*156,UiHeight-70,148,56);
        bool Held(Rect rect)
        {
            // Test every touch independently, so gas + steer + drift + nitro work together.
            foreach(Touch touch in Input.touches)
            {
                if(touch.phase==TouchPhase.Ended||touch.phase==TouchPhase.Canceled)continue;
                var point=new Vector2(touch.position.x,Screen.height-touch.position.y)/UiScale;
                if(rect.Contains(point))return true;
            }
            if(Input.GetMouseButton(0))return rect.Contains(new Vector2(Input.mousePosition.x,Screen.height-Input.mousePosition.y)/UiScale);
            return false;
        }
        DriveInput ReadInput()
        {
            bool left=Input.GetKey(KeyCode.LeftArrow)||Input.GetKey(KeyCode.J)||Held(Control(0));
            bool right=Input.GetKey(KeyCode.RightArrow)||Input.GetKey(KeyCode.L)||Held(Control(1));
            return new DriveInput
            {
                Steer=(right?1:0)-(left?1:0),Gas=Input.GetKey(KeyCode.W)||Input.GetKey(KeyCode.UpArrow)||Held(Control(2)),
                Brake=Input.GetKey(KeyCode.S)||Input.GetKey(KeyCode.DownArrow)||Held(Control(3)),
                Drift=Input.GetKey(KeyCode.LeftShift)||Input.GetKey(KeyCode.RightShift)||Held(Control(4)),
                Nitro=Input.GetKey(KeyCode.N)||Held(Control(5)),Reverse=Input.GetKey(KeyCode.Z),Drive=Input.GetKey(KeyCode.A),
                Shift=Input.GetKey(KeyCode.Space)||Input.GetKey(KeyCode.E)
            };
        }
        void OnGUI()
        {
            if(state==null)return;
            var old=GUI.matrix;GUI.matrix=Matrix4x4.Scale(new Vector3(UiScale,UiScale,1));
            if(label==null){label=new GUIStyle(GUI.skin.label);title=new GUIStyle(GUI.skin.label);button=new GUIStyle(GUI.skin.button);}
            // Keep text readable on a portrait phone even when world pixels are scaled down.
            label.fontSize=Mathf.Max(18,Mathf.RoundToInt(13/UiScale));title.fontSize=Mathf.Max(24,Mathf.RoundToInt(16/UiScale));
            label.normal.textColor=art.cream;title.normal.textColor=art.warm;button.fontSize=Mathf.Max(16,Mathf.RoundToInt(12/UiScale));
            GUI.Box(new Rect(8,8,944,140),GUIContent.none);
            GUI.Label(new Rect(22,14,610,40),"TAIPEI SUNSET DRIVE / UNITY ART STUDY",title);
            GUI.Label(new Rect(22,58,880,40),catalog.routes[routeIndex].id+" · "+catalog.routes[routeIndex].eng,label);
            GUI.Label(new Rect(22,102,920,38),$"{state.Speed:000} KM/H   {state.TimeLeft:000}s   {(state.Reversing?"R":state.HighGear?"HIGH":"LOW")}   NITRO {state.NitroStock}/2 · {state.Charge:00}%   CRASH {state.Crashes}",label);
            if(GUI.Button(new Rect(10,155,145,42),state.Paused?"RESUME":"PAUSE / P",button))Pause();
            if(GUI.Button(new Rect(167,155,145,42),"RETRY / R",button))SetRoute(routeIndex);
            if(GUI.Button(new Rect(324,155,145,42),"ROUTE / T",button))SetRoute(routeIndex+1);
            if(GUI.Button(new Rect(481,155,145,42),art.neon?"NEON / M":"SUNSET / M",button))ToggleMood();
            if(GUI.Button(new Rect(638,155,145,42),state.Automatic?"AT":"MT",button)&&state.Countdown>0)state.Automatic=!state.Automatic;
            if(GUI.Button(new Rect(795,155,155,42),art.internalWidth<=480?"PIXEL 640":"PIXEL 480",button))art.internalWidth=art.internalWidth<=480?640:480;
            string status=state.Finished?(state.Won?"FINISH / RETRY R":"TIME UP / RETRY R"):state.Paused?"PAUSED / PRESS P":state.CrashRemaining>0?"RECOVERING":state.Countdown>0?Mathf.CeilToInt(state.Countdown).ToString():Time.unscaledTime<messageUntil?message:"";
            if(status.Length>0)GUI.Label(new Rect(24,UiHeight*.5f,912,65),status,title);
            string[] names={"LEFT","RIGHT","GAS","BRAKE","DRIFT","NITRO"};
            for(int i=0;i<6;i++)GUI.Box(Control(i),names[i],button);
            bool canDrive=!state.Paused&&!state.Finished&&state.Countdown<=0&&state.CrashRemaining<=0;
            if(GUI.Button(new Rect(12,UiHeight-120,140,40),"D / A",button)&&canDrive)state.Reversing=false;
            if(GUI.Button(new Rect(164,UiHeight-120,140,40),"R / Z",button)&&canDrive){state.Reversing=true;state.BoostRemaining=0;}
            if(GUI.Button(new Rect(316,UiHeight-120,170,40),"SHIFT / SPACE",button)&&canDrive&&!state.Automatic)state.HighGear=!state.HighGear;
            GUI.Label(new Rect(500,UiHeight-120,450,40),"15 ROUTES / ART MIGRATION v0.1",label);
            GUI.matrix=old;
        }
        void OnDestroy()
        {
            if(playerMesh)Destroy(playerMesh);if(trafficMeshes!=null)foreach(var mesh in trafficMeshes)if(mesh)Destroy(mesh);
            if(art)Destroy(art);
        }
    }
}
