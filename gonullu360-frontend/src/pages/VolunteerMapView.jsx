import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import TurkeyMap from 'turkey-map-react';
import { getVolunteerMapStats, syncVolunteerMapStats } from '../services/api';
import './VolunteerMapView.css';
import './VolunteerMapSync.css';
import './VolunteerMapDetail.css';
import './VolunteerMapEnhancements.css';

const MAP_METRICS = {
  volunteers: {
    label: 'Gönüllü sayısı', source: 'Gönüllü 360', unit: 'gönüllü', rankingTitle: 'En Fazla Gönüllüsü Olan 5 İl', value: city => city.volunteerCount || 0,
  },
  students: {
    label: 'Öğrenci sayısı', source: 'MEB', unit: 'öğrenci', rankingTitle: 'En Fazla Öğrencisi Olan 5 İl', value: city => city.studentCount || 0,
  },
  events: {
    label: 'Aylık etkinlik', source: 'Katılım verileri', unit: 'aylık etkinlik', rankingTitle: 'Aylık Etkinliği En Yüksek 5 İl', value: city => city.monthlyAverageEvents || 0,
  },
  universities: {
    label: 'Üniversite sayısı', source: 'YÖK', unit: 'üniversite', rankingTitle: 'En Fazla Üniversitesi Olan 5 İl', value: city => city.educationInstitutions?.universities || 0,
  },
};

const normalizeCityKey = value => String(value || '')
  .trim()
  .toLocaleLowerCase('tr-TR')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '');

export default function VolunteerMapView() {
  const [data, setData] = useState(null);
  const [isRestoringStoredCity, setIsRestoringStoredCity] = useState(() => (
    Boolean(sessionStorage.getItem('volunteerMapFocusedCity'))
  ));
  const [selectedCity, setSelectedCity] = useState('');
  const [focusedCity, setFocusedCity] = useState(null);
  const [isMapTransitioning, setIsMapTransitioning] = useState(false);
  const [hoveredCity, setHoveredCity] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ left: 0, top: 0 });
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [syncMessageType, setSyncMessageType] = useState('');
  const [mapMetric, setMapMetric] = useState('volunteers');
  const [citySearch, setCitySearch] = useState('');
  const [compareLeft, setCompareLeft] = useState('İstanbul');
  const [compareRight, setCompareRight] = useState('Ankara');
  const transitionTimerRef = useRef(null);
  const restoringCityRef = useRef(false);
  const mapStageRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapCitiesRef = useRef({});
  const [zoomTransform, setZoomTransform] = useState({ x: 0, y: 0, scale: 1 });

  const loadData = useCallback(async () => {
    try {
      const result = await getVolunteerMapStats();
      setData(result);
      setError('');
    } catch {
      setError('Gönüllü haritası verileri alınamadı.');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!data || focusedCity) return;
    const storedCityName = sessionStorage.getItem('volunteerMapFocusedCity');
    if (!storedCityName) {
      setIsRestoringStoredCity(false);
      return;
    }
    const storedCity = mapCitiesRef.current[normalizeCityKey(storedCityName)];
    if (!storedCity) {
      sessionStorage.removeItem('volunteerMapFocusedCity');
      setIsRestoringStoredCity(false);
      return;
    }

    restoringCityRef.current = true;
    setSelectedCity(storedCity.name);
    setFocusedCity(storedCity);
    setIsMapTransitioning(false);
  }, [data, focusedCity]);

  useEffect(() => () => window.clearTimeout(transitionTimerRef.current), []);

  useEffect(() => {
    if (!syncMessage) return undefined;
    const messageTimer = window.setTimeout(() => {
      setSyncMessage('');
      setSyncMessageType('');
    }, 3000);

    return () => window.clearTimeout(messageTimer);
  }, [syncMessage]);

  useLayoutEffect(() => {
    if (!focusedCity) return undefined;

    const mapBounds = mapContainerRef.current?.getBoundingClientRect();
    const stageBounds = mapStageRef.current?.getBoundingClientRect();
    const cityPath = mapContainerRef.current?.querySelector(`#${focusedCity.id} path`);
    const cityBounds = cityPath?.getBoundingClientRect();
    const citySvg = cityPath?.ownerSVGElement;
    const screenMatrix = citySvg?.getScreenCTM();
    if (!mapBounds || !stageBounds || !cityBounds || !cityPath || !citySvg || !screenMatrix) {
      setIsMapTransitioning(false);
      return undefined;
    }

    const targetX = stageBounds.left + (stageBounds.width * 0.22);
    const targetY = mapBounds.top + (mapBounds.height * 0.45);
    const scale = Math.max(1, Math.min(
      (mapBounds.width * 0.29) / Math.max(cityBounds.width, 1),
      (mapBounds.height * 0.54) / Math.max(cityBounds.height, 1),
    ));
    const targetPoint = citySvg.createSVGPoint();
    targetPoint.x = targetX;
    targetPoint.y = targetY;
    const targetInSvg = targetPoint.matrixTransform(screenMatrix.inverse());
    const cityBox = cityPath.getBBox();
    const cityCenterX = cityBox.x + (cityBox.width / 2);
    const cityCenterY = cityBox.y + (cityBox.height / 2);

    const applyZoom = () => {
      setZoomTransform({
        x: targetInSvg.x - (cityCenterX * scale),
        y: targetInSvg.y - (cityCenterY * scale),
        scale,
      });
    };

    if (restoringCityRef.current) {
      restoringCityRef.current = false;
      applyZoom();
      const revealFrame = window.requestAnimationFrame(() => setIsRestoringStoredCity(false));
      return () => window.cancelAnimationFrame(revealFrame);
    }

    const frame = window.requestAnimationFrame(() => {
      applyZoom();
      transitionTimerRef.current = window.setTimeout(() => setIsMapTransitioning(false), 1900);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusedCity]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage('');
    setSyncMessageType('');
    try {
      await syncVolunteerMapStats();
      await loadData();
      setSyncMessage('Veriler başarıyla güncellendi.');
      setSyncMessageType('success');
    } catch (requestError) {
      await loadData();
      setSyncMessage(requestError.response?.data?.error || 'Veriler güncellenemedi.');
      setSyncMessageType('error');
    } finally {
      setSyncing(false);
    }
  };

  const formatDateTime = value => value
    ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Henüz yok';

  const activeCityName = focusedCity?.name || selectedCity;
  const cityStats = useMemo(
    () => data?.cities.find(item => normalizeCityKey(item.city) === normalizeCityKey(activeCityName)),
    [activeCityName, data],
  );

  const metricConfig = MAP_METRICS[mapMetric];
  const maxMetricValue = useMemo(
    () => Math.max(...(data?.cities || []).map(metricConfig.value), 1),
    [data?.cities, metricConfig],
  );
  const topCities = useMemo(
    () => [...(data?.cities || [])]
      .sort((a, b) => metricConfig.value(b) - metricConfig.value(a))
      .slice(0, 5),
    [data?.cities, metricConfig],
  );

  const citiesWithVolunteers = useMemo(
    () => (data?.cities || []).filter(city => city.volunteerCount > 0).length,
    [data?.cities],
  );

  const totalMonthlyEvents = useMemo(
    () => (data?.cities || []).reduce((sum, city) => sum + city.monthlyAverageEvents, 0),
    [data?.cities],
  );

  const averageVolunteers = data?.cities?.length ? data.totalVolunteers / data.cities.length : 0;
  const averageDifference = cityStats && averageVolunteers
    ? ((cityStats.volunteerCount - averageVolunteers) / averageVolunteers) * 100
    : 0;
  const averageStatus = averageDifference > 0 ? 'above' : averageDifference < 0 ? 'below' : 'equal';
  const averageDifferenceLabel = averageStatus === 'above'
    ? `+${Math.abs(averageDifference).toFixed(0)}%`
    : averageStatus === 'below'
      ? `−${Math.abs(averageDifference).toFixed(0)}%`
      : '0%';
  const leftComparison = data?.cities?.find(city => city.city === compareLeft);
  const rightComparison = data?.cities?.find(city => city.city === compareRight);

  const getCityColor = cityName => {
    const cityKey = normalizeCityKey(cityName);
    const city = data?.cities?.find(item => normalizeCityKey(item.city) === cityKey);
    const metricValue = city ? metricConfig.value(city) : 0;
    if (metricValue === 0) return '#cbd5d2';
    const ratio = metricValue / maxMetricValue;
    if (ratio <= 0.2) return '#ccefe5';
    if (ratio <= 0.4) return '#8cddc8';
    if (ratio <= 0.6) return '#45c6a5';
    if (ratio <= 0.8) return '#10aa82';
    return '#087f64';
  };

  const cityWrapper = (cityComponent, city) => React.cloneElement(cityComponent, {
    key: city.id,
    className: focusedCity
      ? city.name === activeCityName ? 'map-city map-city-selected' : 'map-city map-city-muted'
      : 'map-city',
    style: {
      ...cityComponent.props.style,
      '--focused-city-color': getCityColor(city.name),
      '--city-density-color': city.name === hoveredCity && !focusedCity
        ? '#66d1b7'
        : getCityColor(city.name),
      fill: focusedCity && city.name === activeCityName
        ? getCityColor(city.name)
        : city.name === hoveredCity ? '#66d1b7' : getCityColor(city.name),
      stroke: '#34383b',
      strokeWidth: 1.2,
      cursor: 'pointer',
      transform: focusedCity && city.name === activeCityName
        ? `matrix(${zoomTransform.scale}, 0, 0, ${zoomTransform.scale}, ${zoomTransform.x}, ${zoomTransform.y})`
        : undefined,
      transformBox: 'view-box',
      transformOrigin: '0 0',
      transition: isRestoringStoredCity
        ? 'none'
        : focusedCity
          ? city.name === activeCityName
            ? 'fill 500ms ease, transform 1850ms cubic-bezier(.22, .75, .18, 1)'
            : 'fill 300ms ease, opacity 1450ms 100ms cubic-bezier(.4, 0, .2, 1), filter 1450ms 100ms ease'
          : 'fill 180ms ease',
    },
    onMouseLeave: event => {
      cityComponent.props.onMouseLeave?.(event);
      if (!focusedCity) setHoveredCity('');
    },
  });

  const rememberMapCity = (cityComponent, city) => {
    mapCitiesRef.current[normalizeCityKey(city.name)] = city;
    return cityWrapper(cityComponent, city);
  };

  const handleCityHover = city => {
    if (focusedCity) return;
    setHoveredCity(city.name);
    const mapBounds = mapContainerRef.current?.getBoundingClientRect();
    const cityBounds = mapContainerRef.current?.querySelector(`#${city.id} path`)?.getBoundingClientRect();
    if (!mapBounds || !cityBounds) return;
    setTooltipPosition({
      left: cityBounds.left - mapBounds.left + (cityBounds.width / 2),
      top: cityBounds.top - mapBounds.top - 10,
    });
  };

  const handleCitySelect = city => {
    window.clearTimeout(transitionTimerRef.current);
    sessionStorage.setItem('volunteerMapFocusedCity', city.name);
    setZoomTransform({ x: 0, y: 0, scale: 1 });
    setSelectedCity(city.name);
    setFocusedCity(city);
    setIsMapTransitioning(true);
    setHoveredCity('');
  };

  const handleReturnToMap = () => {
    window.clearTimeout(transitionTimerRef.current);
    sessionStorage.removeItem('volunteerMapFocusedCity');
    setIsMapTransitioning(false);
    setFocusedCity(null);
    setSelectedCity('');
  };

  const openCityByName = cityName => {
    const mapCity = mapCitiesRef.current[normalizeCityKey(cityName)];
    if (mapCity) handleCitySelect(mapCity);
  };

  const formatMetricValue = value => Number(value || 0).toLocaleString('tr-TR', {
    maximumFractionDigits: 1,
  });

  if (error) return <section className="volunteer-map-state error">{error}</section>;
  if (!data) return <section className="volunteer-map-state">Harita yükleniyor…</section>;

  return (
    <section className={`volunteer-map-view${isRestoringStoredCity ? ' is-restoring-stored-city' : ''}`}>
      <div className={`education-sync-card ${data.educationSyncStatus || 'not_started'}`}>
        <div>
          <strong>Eğitim verileri</strong>
          <span>Dönem: {data.educationInstitutionPeriod}</span>
          <span>Son başarılı güncelleme: {formatDateTime(data.educationStatsSyncedAt)}</span>
          <span>Son deneme: {formatDateTime(data.educationSyncLastAttemptAt)}</span>
        </div>
        <div className="education-sync-actions">
          <span className="education-sync-status">
            {data.educationSyncStatus === 'success' ? 'Güncel' : data.educationSyncStatus === 'running' ? 'Güncelleniyor' : data.educationSyncStatus === 'failed' ? 'Güncelleme başarısız' : 'Henüz güncellenmedi'}
          </span>
          <button type="button" onClick={handleSync} disabled={syncing}>
            {syncing ? 'Güncelleniyor…' : 'Şimdi Güncelle'}
          </button>
        </div>
        {syncMessage && (
          <p className={`education-sync-message ${syncMessageType}`}>
            {syncMessage}
          </p>
        )}
      </div>

      <div className={`map-toolbar-card map-context-layer${focusedCity ? isMapTransitioning ? ' is-fading' : ' is-hidden' : ''}`}>
            <label className="map-city-search">
              <span aria-hidden="true">⌕</span>
              <input
                list="volunteer-map-cities"
                value={citySearch}
                onChange={event => setCitySearch(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') openCityByName(citySearch);
                }}
                placeholder="İl ara…"
                aria-label="Haritada il ara"
              />
              <datalist id="volunteer-map-cities">
                {data.cities.map(city => <option key={city.city} value={city.city} />)}
              </datalist>
              <button type="button" onClick={() => openCityByName(citySearch)}>Göster</button>
            </label>
            <div className="map-metric-tabs" aria-label="Harita renklendirme ölçütü">
              {Object.entries(MAP_METRICS).map(([key, metric]) => (
                <button
                  key={key}
                  type="button"
                  className={mapMetric === key ? 'active' : ''}
                  onClick={() => setMapMetric(key)}
                  title={`Kaynak: ${metric.source}`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
      </div>

      <div ref={mapStageRef} className={`city-map-persistent-stage${focusedCity ? ' has-focused-city' : ''}`}>
        <div
          ref={mapContainerRef}
          className={`turkey-map-wrap${focusedCity ? ' map-is-zooming' : ''}`}
        >
          <TurkeyMap
            showTooltip={false}
            cityWrapper={rememberMapCity}
            onClick={handleCitySelect}
            onHover={handleCityHover}
            customStyle={{ idleColor: '#ffffff', hoverColor: '#dce8e6' }}
          />
          {hoveredCity && !focusedCity && (
            <span
              className="map-city-tooltip"
              style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
            >
              {hoveredCity}
            </span>
          )}
          <div className={`map-color-legend map-context-layer${focusedCity ? isMapTransitioning ? ' is-fading' : ' is-hidden' : ''}`} aria-label={`${metricConfig.label} değerine göre harita renkleri`}>
              <span>{metricConfig.label} <i title={`Kaynak: ${metricConfig.source}`}>ⓘ</i></span>
              <div className="map-color-scale" aria-hidden="true" />
              <small>0</small>
              <small>{formatMetricValue(maxMetricValue / 2)}</small>
              <small>{formatMetricValue(maxMetricValue)}+</small>
          </div>
        </div>

        <aside className={`map-top-cities map-context-layer${focusedCity ? isMapTransitioning ? ' is-fading' : ' is-hidden' : ''}`}>
            <header><div><small>{metricConfig.label}</small><h3>{metricConfig.rankingTitle}</h3></div><span>İlk 5</span></header>
            {topCities.map((city, index) => (
              <button key={city.city} type="button" onClick={() => openCityByName(city.city)}>
                <b>{index + 1}</b>
                <span><strong>{city.city}</strong><small>{formatMetricValue(metricConfig.value(city))} {metricConfig.unit}</small></span>
                <i style={{ '--bar-width': `${(metricConfig.value(city) / Math.max(metricConfig.value(topCities[0] || {}), 1)) * 100}%` }} />
              </button>
            ))}
        </aside>

        {focusedCity && !isMapTransitioning && (
          <strong className="focused-city-name persistent-city-label">{focusedCity.name}</strong>
        )}

        {focusedCity && !isMapTransitioning && (
          <div className="city-persistent-details">
            <button type="button" className="city-detail-back" onClick={handleReturnToMap}>
              <span aria-hidden="true">←</span> Türkiye Haritasına Dön
            </button>
            <div className="city-stat-panel">
              {cityStats ? (
                <>
                  <div className="city-stat-primary">
                    <article title={`Kaynak: MEB · Son dönem: ${data.educationInstitutionPeriod}`}><small>İldeki Öğrenci Sayısı ⓘ</small><strong>{cityStats.studentCount.toLocaleString('tr-TR')}</strong><span>MEB resmî verisi</span></article>
                    <article><small>Mevcut Gönüllü Sayısı</small><strong>{cityStats.volunteerCount.toLocaleString('tr-TR')}</strong><span>Güncel kayıt</span></article>
                    <article><small>Aylık Ortalama Etkinlik</small><strong>{cityStats.monthlyAverageEvents.toLocaleString('tr-TR')}</strong><span>Katılım verilerine göre</span></article>
                  </div>
                  <div className={`city-average-note ${averageStatus}`}>
                    <span>{averageStatus === 'above' ? 'Türkiye ortalamasının üzerinde' : averageStatus === 'below' ? 'Türkiye ortalamasının altında' : 'Türkiye ortalamasıyla aynı'}</span>
                    <strong>{averageDifferenceLabel}</strong>
                    <small>İl ortalaması: {averageVolunteers.toFixed(1)} gönüllü</small>
                  </div>
                  {cityStats.educationInstitutions && (
                    <>
                      <div className="city-stat-source">İldeki eğitim kurumu sayıları · {data.educationInstitutionPeriod}</div>
                      <div className="city-stat-education">
                        <article><small>Üniversite</small><strong>{cityStats.educationInstitutions.universities.toLocaleString('tr-TR')}</strong></article>
                        <article><small>Ortaokul</small><strong>{cityStats.educationInstitutions.middleSchools.toLocaleString('tr-TR')}</strong></article>
                        <article><small>Lise</small><strong>{cityStats.educationInstitutions.highSchools.toLocaleString('tr-TR')}</strong></article>
                        <article><small>Mesleki ve Teknik Lise</small><strong>{cityStats.educationInstitutions.vocationalHighSchools.toLocaleString('tr-TR')}</strong></article>
                      </div>
                    </>
                  )}
                </>
              ) : <div className="city-stat-empty">Bu şehirde kayıtlı aktif gönüllü bulunmuyor.</div>}
            </div>
          </div>
        )}
      </div>

      {!focusedCity && (
        <div className="map-summary-grid map-summary-grid-bottom">
          <article><span className="map-summary-icon">●</span><small>Toplam Gönüllü</small><strong>{data.totalVolunteers.toLocaleString('tr-TR')}</strong><em>81 il genelinde</em></article>
          <article><span className="map-summary-icon">⌖</span><small>Gönüllü Bulunan İl</small><strong>{citiesWithVolunteers}</strong><em>{81 - citiesWithVolunteers} ilde henüz kayıt yok</em></article>
          <article><span className="map-summary-icon">★</span><small>En Aktif İl</small><strong>{topCities[0]?.city || '—'}</strong><em>{topCities[0]?.volunteerCount || 0} gönüllü</em></article>
          <article><span className="map-summary-icon">↗</span><small>Aylık Etkinlik Ortalaması</small><strong>{formatMetricValue(totalMonthlyEvents)}</strong><em>Tüm illerin toplamı</em></article>
        </div>
      )}

      {!focusedCity && (
        <section className="city-comparison-card">
          <header><div><small>Karşılaştırmalı görünüm</small><h3>İki İli Karşılaştır</h3></div><span>Gerçek mevcut veriler</span></header>
          <div className="comparison-selectors">
            <select value={compareLeft} onChange={event => setCompareLeft(event.target.value)}>{data.cities.map(city => <option key={city.city}>{city.city}</option>)}</select>
            <button
              type="button"
              className="comparison-swap-button"
              aria-label="Karşılaştırılan şehirlerin yerini değiştir"
              title="Şehirlerin yerini değiştir"
              onClick={() => {
                setCompareLeft(compareRight);
                setCompareRight(compareLeft);
              }}
            >
              ⇄
            </button>
            <select value={compareRight} onChange={event => setCompareRight(event.target.value)}>{data.cities.map(city => <option key={city.city}>{city.city}</option>)}</select>
          </div>
          {leftComparison && rightComparison && (
            <div className="comparison-table">
              {[
                ['Gönüllü', leftComparison.volunteerCount, rightComparison.volunteerCount],
                ['Öğrenci', leftComparison.studentCount, rightComparison.studentCount],
                ['Aylık etkinlik', leftComparison.monthlyAverageEvents, rightComparison.monthlyAverageEvents],
                ['Üniversite', leftComparison.educationInstitutions?.universities || 0, rightComparison.educationInstitutions?.universities || 0],
              ].map(([label, left, right]) => (
                <div key={label}><strong>{formatMetricValue(left)}</strong><span>{label}</span><strong>{formatMetricValue(right)}</strong></div>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}
