using System;

namespace Taipei
{
    public struct DriveInput
    {
        public float Steer;
        public bool Gas, Brake, Drift, Nitro, Reverse, Drive, Shift;
    }

    // Pure C# state machine, independent from Unity frame rate and scene objects.
    public sealed class DriveSimulation
    {
        public const float TopSpeed = 270, BoostSpeed = 300, NitroDuration = 2.8f;
        public float Speed, Distance, Lateral, Steering, BodyYaw, Charge, BoostRemaining;
        public float TimeLeft, Elapsed, CrashRemaining, RecoveryGrace, Countdown;
        public int NitroStock, Crashes, Score;
        public bool Paused, Finished, Won, HighGear, Automatic = true, Reversing, Drifting;
        public float FinishDistance;
        bool nitroHeld, shiftHeld;
        public DriveSimulation(float length, float seconds)
        {
            if (!(length > 0) || !(seconds > 0)) throw new ArgumentException("Positive race length and budget required.");
            FinishDistance = length; TimeLeft = seconds; Countdown = 3;
        }
        static float Clamp(float v, float min, float max) => Math.Min(max, Math.Max(min, v));
        static float Ease(float current, float target, float response, float dt)
            => current + (target - current) * (1 - (float)Math.Exp(-response * dt));
        public void ReleaseInputs() { nitroHeld = false; shiftHeld = false; Steering = 0; }
        public bool ActivateNitro()
        {
            if (Paused || Finished || Countdown > 0 || CrashRemaining > 0 || Reversing || Speed < 60 || NitroStock <= 0 || BoostRemaining > 0) return false;
            NitroStock--; BoostRemaining = NitroDuration; Speed = Math.Min(BoostSpeed, Speed + 10); return true;
        }
        public void Crash()
        {
            if (Paused || Finished || Countdown > 0 || CrashRemaining > 0 || RecoveryGrace > 0) return;
            Crashes++; CrashRemaining = 2.9f; Speed = 0; BoostRemaining = 0; Drifting = false; BodyYaw = 0;
        }
        public void Step(float dt, DriveInput input, float curve)
        {
            if (float.IsNaN(dt) || float.IsInfinity(dt) || dt <= 0 || dt > .05f) throw new ArgumentOutOfRangeException(nameof(dt), "Use a fixed simulation step <= .05 s.");
            if (Paused || Finished) return;
            if (Countdown > 0) { Countdown = Math.Max(0, Countdown - dt); return; }
            Elapsed += dt; TimeLeft = Math.Max(0, TimeLeft - dt);
            if (TimeLeft <= 0) { Finished = true; Won = false; return; }
            RecoveryGrace = Math.Max(0, RecoveryGrace - dt);
            if (CrashRemaining > 0)
            {
                CrashRemaining = Math.Max(0, CrashRemaining - dt);
                if (CrashRemaining == 0) { Speed = 118; Lateral = Clamp(Lateral, -7, 7); RecoveryGrace = 1.6f; }
                return;
            }
            if (input.Reverse) { Reversing = true; BoostRemaining = 0; }
            if (input.Drive) Reversing = false;
            if (Automatic && !Reversing)
            {
                if (Speed >= 145) HighGear = true;
                else if (Speed < 105) HighGear = false;
            }
            if (!Automatic && input.Shift && !shiftHeld) HighGear = !HighGear;
            shiftHeld = input.Shift;
            if (input.Nitro && !nitroHeld) ActivateNitro();
            nitroHeld = input.Nitro;
            BoostRemaining = Math.Max(0, BoostRemaining - dt);
            Steering = Ease(Steering, Clamp(input.Steer, -1, 1), 7, dt);
            Drifting = !Reversing && Speed >= 58 && input.Drift && Math.Abs(Steering) > .2f && Math.Abs(curve) > .12f;
            float yawCap = Clamp(30 + Math.Abs(curve) * 12, 30, 58);
            BodyYaw = Ease(BodyYaw, Drifting ? Steering * yawCap : Steering * 5, Drifting ? 8 : 15, dt);
            if (Drifting && NitroStock < 2 && Math.Abs(Lateral) <= RoadPath.HalfWidth - 1)
            {
                Charge += 50 * dt * (input.Gas ? 1 : .65f);
                if (Charge >= 100) { NitroStock++; Charge = NitroStock == 2 ? 0 : Charge - 100; }
                Score += 1;
            }
            float limit = Reversing ? 45 : HighGear ? TopSpeed : 185;
            float thrust = (HighGear ? 35.5f : 57.6f) * (float)Math.Pow(Math.Max(0, 1 - Speed / limit), HighGear ? 1.38 : 1.44);
            float boost = BoostRemaining > 0 ? Math.Min(38, Math.Max(0, BoostSpeed - Speed) * .55f) : 0;
            Speed += ((input.Gas || boost > 0 ? thrust : -12) + boost - (input.Brake ? 125 : 0)) * dt;
            if (Speed > limit && boost == 0) Speed -= (Speed - limit) * .3f * dt;
            Speed = Clamp(Speed, 0, Reversing ? 45 : BoostSpeed);
            // Curvature affects road-space lateral motion; body yaw never changes collider width.
            float authority = 2.8f + Speed / 70;
            Lateral += (Steering * authority - curve * Speed * Speed * (Drifting ? .000055f : .00009f)) * dt;
            if (Math.Abs(Lateral) > RoadPath.HalfWidth - .8f)
            {
                Speed = Math.Max(30, Speed - 45 * dt); Lateral = Clamp(Lateral, -10.5f, 10.5f);
                Drifting = false;
            }
            Distance = Math.Max(0, Distance + Speed / 3.6f * dt * (Reversing ? -1 : 1));
            if (Distance >= FinishDistance) { Distance = FinishDistance; Finished = true; Won = true; }
        }
    }
}
