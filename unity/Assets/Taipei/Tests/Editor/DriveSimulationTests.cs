using System;
using NUnit.Framework;
using UnityEngine;

namespace Taipei.Tests
{
    public sealed class DriveSimulationTests
    {
        const float Dt=1f/60;
        static DriveSimulation Race()=>new DriveSimulation(5000,90){Countdown=0};
        [Test]
        public void PauseFreezesAllRaceClocks()
        {
            var s=Race();s.Speed=180;s.NitroStock=1;Assert.That(s.ActivateNitro(),Is.True);
            s.Paused=true;float boost=s.BoostRemaining;
            for(int i=0;i<120;i++)s.Step(Dt,new DriveInput{Gas=true},1);
            Assert.That(s.TimeLeft,Is.EqualTo(90));Assert.That(s.Elapsed,Is.Zero);
            Assert.That(s.BoostRemaining,Is.EqualTo(boost));Assert.That(s.Distance,Is.Zero);
        }
        [Test]
        public void HeldNitroConsumesOnlyOneStock()
        {
            var s=Race();s.Speed=170;s.NitroStock=2;
            for(int i=0;i<240;i++)s.Step(Dt,new DriveInput{Gas=true,Nitro=true},0);
            Assert.That(s.NitroStock,Is.EqualTo(1));Assert.That(s.BoostRemaining,Is.Zero);
            s.Step(Dt,new DriveInput{Gas=true},0);s.Step(Dt,new DriveInput{Gas=true,Nitro=true},0);
            Assert.That(s.NitroStock,Is.Zero);Assert.That(s.BoostRemaining,Is.GreaterThan(2.7));
        }
        [Test]
        public void BoostAndDriftChargeCanRunSimultaneously()
        {
            var s=Race();s.Speed=180;s.NitroStock=1;s.Charge=10;
            for(int i=0;i<45;i++)s.Step(Dt,new DriveInput{Gas=true,Nitro=true,Drift=true,Steer=.65f},1);
            Assert.That(s.BoostRemaining,Is.GreaterThan(1));Assert.That(s.Drifting,Is.True);
            Assert.That(s.Charge,Is.GreaterThan(20));Assert.That(s.Speed,Is.LessThanOrEqualTo(300));
        }
        [TestCase(0f)][TestCase(30f)][TestCase(59f)]
        public void LowSpeedCannotSpendNitro(float speed)
        {var s=Race();s.Speed=speed;s.NitroStock=1;Assert.That(s.ActivateNitro(),Is.False);Assert.That(s.NitroStock,Is.EqualTo(1));}
        [Test]
        public void ReverseCannotBoostOrPassStart()
        {
            var s=Race();s.Speed=170;s.NitroStock=1;s.Reversing=true;
            Assert.That(s.ActivateNitro(),Is.False);
            for(int i=0;i<120;i++)s.Step(Dt,new DriveInput{Gas=true,Reverse=true},0);
            Assert.That(s.Distance,Is.Zero);Assert.That(s.Speed,Is.LessThanOrEqualTo(45));
        }
        [Test]
        public void CrashHasSinglePenaltyAndRecoveryGrace()
        {
            var s=Race();s.Speed=180;s.Crash();s.Crash();Assert.That(s.Crashes,Is.EqualTo(1));
            for(int i=0;i<175;i++)s.Step(Dt,new DriveInput(),0);
            Assert.That(s.CrashRemaining,Is.Zero);Assert.That(s.RecoveryGrace,Is.GreaterThan(1.5));
            Assert.That(s.Speed,Is.GreaterThan(117));s.Crash();Assert.That(s.Crashes,Is.EqualTo(1));
        }
        [Test]
        public void FullNitroStockDoesNotOverflow()
        {
            var s=Race();s.Speed=160;s.NitroStock=2;
            for(int i=0;i<60;i++)s.Step(Dt,new DriveInput{Gas=true,Drift=true,Steer=.6f},1);
            Assert.That(s.NitroStock,Is.EqualTo(2));Assert.That(s.Charge,Is.Zero);
        }
        [Test]
        public void CountdownDoesNotSpendRaceBudget()
        {
            var s=new DriveSimulation(1000,30);
            for(int i=0;i<180;i++)s.Step(Dt,new DriveInput{Gas=true},0);
            Assert.That(s.Distance,Is.Zero);Assert.That(s.TimeLeft,Is.EqualTo(30));
        }
        [Test]
        public void TimeUpFreezesSimulation()
        {
            var s=Race();s.TimeLeft=Dt;s.Step(Dt,new DriveInput{Gas=true},0);
            Assert.That(s.Finished,Is.True);Assert.That(s.Won,Is.False);
            float elapsed=s.Elapsed;s.Step(Dt,new DriveInput{Gas=true},0);Assert.That(s.Elapsed,Is.EqualTo(elapsed));
        }
        [Test]
        public void FinishClampsAtLine()
        {
            var s=Race();s.Speed=200;s.Distance=s.FinishDistance-.1f;
            s.Step(Dt,new DriveInput{Gas=true},0);
            Assert.That(s.Finished&&s.Won,Is.True);Assert.That(s.Distance,Is.EqualTo(s.FinishDistance));
        }
        [Test]
        public void ManualShiftUsesPressEdge()
        {
            var s=Race();s.Automatic=false;
            for(int i=0;i<12;i++)s.Step(Dt,new DriveInput{Shift=true},0);
            Assert.That(s.HighGear,Is.True);
            s.Step(Dt,new DriveInput(),0);s.Step(Dt,new DriveInput{Shift=true},0);Assert.That(s.HighGear,Is.False);
        }
        [TestCase(float.NaN)][TestCase(float.PositiveInfinity)][TestCase(-1f)][TestCase(.25f)]
        public void InvalidFrameDeltaRejected(float dt)
        {Assert.Throws<ArgumentOutOfRangeException>(()=>Race().Step(dt,new DriveInput(),0));}
        [Test]
        public void AllFifteenRoadsHaveFiniteGeometryAndCorrectLengths()
        {
            var routes=RouteCatalog.Load().routes;Assert.That(routes.Length,Is.EqualTo(15));
            foreach(var route in routes)
            {
                var path=new RoadPath(route);Assert.That(path.Length,Is.EqualTo(route.lengthMeters));
                for(float d=0;d<=path.Length+200;d+=8)
                {
                    path.Sample(d,out Vector3 p,out Vector3 right,out Quaternion rotation,out float curve);
                    Assert.That(float.IsNaN(p.x)||float.IsInfinity(p.y)||float.IsNaN(p.z)||float.IsNaN(rotation.w)||float.IsNaN(curve),Is.False,route.id);
                    Assert.That(right.magnitude,Is.EqualTo(1).Within(.001),route.id);
                }
            }
        }
    }
}
