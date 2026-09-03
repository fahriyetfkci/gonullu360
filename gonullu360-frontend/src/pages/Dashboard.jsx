import React, { useEffect, useState } from 'react';
import { getDashboardStats, getDashboardRange } from '../services/api';
import ActiveVolunteers from '../components/ActiveVolunteers';
import CompletedEvents from '../components/CompletedEvents';
import MonthlyChart from '../components/MonthlyChart';
import EventParticipation from '../components/EventParticipation';
import DemographicChart from '../components/DemographicChart';
import VolunteerList from '../components/VolunteerList';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import './DashboardStates.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [allYearsData, setAllYearsData] = useState(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboardRange().then(data => {
      setAllYearsData(data);
      if (data.endYear) setYear(data.endYear);
    }).catch(() => setError('Yıllık grafik verileri alınamadı.'));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    getDashboardStats(year)
      .then(setStats)
      .catch(() => { setStats(null); setError('Dashboard verileri alınamadı. Backend bağlantısını kontrol edin.'); })
      .finally(() => setLoading(false));
  }, [year]);

  return <div style={{display:'flex',width:'100%',minHeight:'100vh',background:'#f5f6fa',overflow:'hidden'}}>
    <Sidebar />
    <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}>
      <Navbar />
      <main style={{width:'100%',padding:24,boxSizing:'border-box',overflowX:'hidden'}}>
        <div style={{marginBottom:24}}><h2 style={{margin:0,color:'#333',fontSize:22}}>Anasayfa <span style={{fontSize:14,color:'#888',fontWeight:400}}>| Hoş Geldin!</span></h2></div>
        {loading && !stats && <DashboardSkeleton />}
        {error && !stats && <div style={{...messageStyle,color:'#b42318',background:'#fff1f0'}}>{error}</div>}
        {stats && <>
          <div style={rowStyle}>
            <div style={cardWrapper}><ActiveVolunteers data={stats.activeVolunteers} /></div>
            <div style={cardWrapper}><CompletedEvents data={stats.completedEvents} /></div>
            <div style={{flex:'2 1 460px',minWidth:300}}><MonthlyChart data={stats.monthlyVolunteers} year={year} onYearChange={setYear} allYearsData={allYearsData} /></div>
          </div>
          <div style={rowStyle}>
            <div style={{flex:'1 1 460px',minWidth:300}}><EventParticipation data={stats.eventParticipation} /></div>
            <div style={{flex:'1 1 360px',minWidth:300}}><DemographicChart data={stats.demographicData} /></div>
          </div>
          <VolunteerList volunteers={stats.volunteers} pagination={stats.pagination} />
        </>}
      </main>
    </div>
  </div>;
}

const rowStyle = {display:'flex',gap:24,marginBottom:24,flexWrap:'wrap',alignItems:'stretch'};
const cardWrapper = {flex:'1 1 240px',minWidth:220,display:'flex'};
const messageStyle = {padding:24,borderRadius:10,background:'#fff',color:'#666'};

function DashboardSkeleton() {
  return <div className="dashboard-skeleton" aria-label="Dashboard verileri yükleniyor">
    <div className="dashboard-skeleton-row">
      <div className="dashboard-skeleton-card small" />
      <div className="dashboard-skeleton-card small" />
      <div className="dashboard-skeleton-card large" />
    </div>
    <div className="dashboard-skeleton-row">
      <div className="dashboard-skeleton-card chart" />
      <div className="dashboard-skeleton-card chart" />
    </div>
    <div className="dashboard-skeleton-card table" />
  </div>;
}
