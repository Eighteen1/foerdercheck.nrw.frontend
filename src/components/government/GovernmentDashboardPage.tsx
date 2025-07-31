import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Spinner } from 'react-bootstrap';
import { supabase } from '../../lib/supabase';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const TYPE_LABELS: Record<string, string> = {
  "neubau": "Neubau Eigenheim",
  "ersterwerb-eigenheim": "Ersterwerb Eigenheim",
  "bestandserwerb-eigenheim": "Bestandserwerb Eigenheim",
  "bestandserwerb-wohnung": "Bestandserwerb Eigentumswohnung",
  "ersterwerb-wohnung": "Ersterwerb Eigentumswohnung",
  "neubau-wohnung": "Neubau Eigentumswohnung",
  "nutzungsaenderung": "Nutzungsänderung"
};

const COLORS = ['#388e3c', '#d32f2f'];

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

interface DashboardData {
  newApplicationsByDay: any[];
  reviewedApplicationsByDay: any[];
  outcomesByDay: any[];
  outcomeDistribution: any[];
  averageProcessingTime: number;
  cityAverageProcessingTime: number;
}

const GovernmentDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [data, setData] = useState<DashboardData | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndData = async () => {
      const session = await supabase.auth.getSession();
      const userObj = session?.data?.session?.user;
      
      if (!userObj) return;

      // Get agent's city
      const { data: agentData } = await supabase
        .from("agents")
        .select("city_id")
        .eq("id", userObj.id)
        .single();

      if (agentData?.city_id) {
        setCityId(agentData.city_id);
        await fetchDashboardData(agentData.city_id);
      }
    };

    fetchUserAndData();
  }, []);

  useEffect(() => {
    if (cityId) {
      fetchDashboardData(cityId);
    }
  }, [selectedType, timeRange, cityId]);

  const fetchDashboardData = async (cityId: string) => {
    setLoading(true);
    try {
      // Calculate date range based on timeRange
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
      }

      // Fetch KPIs for the city within date range
      let query = supabase
        .from("application_kpis")
        .select("*")
        .eq("city_id", cityId)
        .gte("submission_date", startDate.toISOString())
        .lte("submission_date", endDate.toISOString());

      if (selectedType !== 'all') {
        query = query.eq("type", selectedType);
      }

      const { data: kpis, error } = await query;

      if (error) throw error;

      // Process data for charts
      const processedData = processKpiData(kpis || [], startDate, endDate);
      setData(processedData);

      // Get city name
      const { data: cityData } = await supabase
        .from("cities")
        .select("name")
        .eq("id", cityId)
        .single();

      if (cityData?.name) {
        setCity(cityData.name);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processKpiData = (kpis: any[], startDate: Date, endDate: Date) => {
    // Initialize data structures
    const newApplicationsByDay: any[] = [];
    const reviewedApplicationsByDay: any[] = [];
    const outcomesByDay: any[] = [];
    const outcomeDistribution: any[] = [];
    
    // Create date range array
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Initialize data points
    dates.forEach(date => {
      const dateStr = formatDate(date);
      newApplicationsByDay.push({ date: dateStr, count: 0 });
      reviewedApplicationsByDay.push({ date: dateStr, count: 0 });
      outcomesByDay.push({
        date: dateStr,
        approved: 0,
        rejected: 0
      });
    });

    // Process KPIs
    let totalProcessingTime = 0;
    let processedCount = 0;

    kpis.forEach(kpi => {
      const submittedDate = formatDate(new Date(kpi.submission_date));
      const newAppIndex = newApplicationsByDay.findIndex(d => d.date === submittedDate);
      if (newAppIndex !== -1) {
        newApplicationsByDay[newAppIndex].count++;
      }

      if (kpi.finished_at) {
        const finishedDate = formatDate(new Date(kpi.finished_at));
        const reviewedIndex = reviewedApplicationsByDay.findIndex(d => d.date === finishedDate);
        if (reviewedIndex !== -1) {
          reviewedApplicationsByDay[reviewedIndex].count++;
        }

        const outcomeIndex = outcomesByDay.findIndex(d => d.date === finishedDate);
        if (outcomeIndex !== -1) {
          if (kpi.status === 'approved') {
            outcomesByDay[outcomeIndex].approved++;
          } else if (kpi.status === 'rejected') {
            outcomesByDay[outcomeIndex].rejected++;
          }
        }

        // Calculate processing time
        const processingTime = new Date(kpi.finished_at).getTime() - new Date(kpi.submission_date).getTime();
        totalProcessingTime += processingTime;
        processedCount++;
      }
    });

    // Calculate outcome distribution
    const totalApproved = kpis.filter(kpi => kpi.status === 'approved').length;
    const totalRejected = kpis.filter(kpi => kpi.status === 'rejected').length;
    outcomeDistribution.push(
      { name: 'Bewilligt', value: totalApproved },
      { name: 'Abgelehnt', value: totalRejected }
    );

    // Calculate average processing time in days
    const averageProcessingTime = processedCount > 0 ? totalProcessingTime / (processedCount * 24 * 60 * 60 * 1000) : 0;

    return {
      newApplicationsByDay,
      reviewedApplicationsByDay,
      outcomesByDay,
      outcomeDistribution,
      averageProcessingTime,
      cityAverageProcessingTime: 0 // TODO: Implement city average calculation
    };
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" style={{ color: '#064497' }} />
      </div>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header Section */}
      <div className="mb-4 p-4" style={{ 
        background: '#ffffff', 
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        width: '100%'
      }}>
        <h4 style={{ 
          color: '#064497', 
          marginBottom: '12px',
          fontSize: '24px',
          fontWeight: '500'
        }}>Dashboard Übersicht</h4>
        <p style={{ color: '#495057', marginBottom: '8px' }}>
          Sie sehen hier die Antragsdaten für {city ? city : 'Ihre Stadt'}. 
          Nutzen Sie die Filter, um die Daten nach Zeitraum und Fördervariante zu analysieren.
        </p>
        <p style={{ color: '#6c757d', fontSize: '0.9rem', marginBottom: 0 }}>
          Die Grafiken zeigen Ihnen die Entwicklung der Anträge, Bearbeitungszeiten und Entscheidungen im gewählten Zeitraum.
        </p>
      </div>

      {/* Filters */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Vorhabenstyp</Form.Label>
            <Form.Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Alle Typen</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Zeitraum</Form.Label>
            <Form.Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7d">Letzte 7 Tage</option>
              <option value="30d">Letzte 30 Tage</option>
              <option value="90d">Letzte 90 Tage</option>
              <option value="1y">Letztes Jahr</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Charts */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Neue Anträge pro Tag</Card.Title>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.newApplicationsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#064497" name="Neue Anträge" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Bearbeitete Anträge pro Tag</Card.Title>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.reviewedApplicationsByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="count" stroke="#064497" name="Bearbeitete Anträge" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Bewilligte vs. Abgelehnte Anträge</Card.Title>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.outcomesByDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="approved" stroke="#388e3c" name="Bewilligt" strokeWidth={2} />
                    <Line type="monotone" dataKey="rejected" stroke="#d32f2f" name="Abgelehnt" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Verteilung Bewilligt/Abgelehnt</Card.Title>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.outcomeDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {data?.outcomeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* KPIs */}
      <Row>
        <Col md={6}>
          <Card>
            <Card.Body>
              <Card.Title>Durchschnittliche Bearbeitungszeit</Card.Title>
              <div className="d-flex align-items-center">
                <h2 className="mb-0">{data?.averageProcessingTime.toFixed(1)} Tage</h2>
                {data && data.cityAverageProcessingTime > 0 && (
                  <div className="ms-3">
                    <small className="text-muted">
                      {data.averageProcessingTime > data.cityAverageProcessingTime ? '↑' : '↓'} 
                      {Math.abs(data.averageProcessingTime - data.cityAverageProcessingTime).toFixed(1)} Tage vs. Durchschnitt
                    </small>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default GovernmentDashboardPage; 