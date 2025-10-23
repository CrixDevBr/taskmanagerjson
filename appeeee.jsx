import { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Navbar, Nav, Button, Form, ListGroup, Row, Col, Alert } from 'react-bootstrap';

const API_BASE = 'http://localhost:3001';

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error) => {
      console.error('ErrorBoundary caught:', error);
      setHasError(true);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return <Alert variant="danger">Something went wrong. Please refresh the page.</Alert>;
  }
  return children;
}

function App() {
  const [username, setUsername] = useState(localStorage.getItem('username') || '');

  useEffect(() => {
    if (!username) {
      const user = prompt('Enter your username:');
      if (user) {
        setUsername(user);
        localStorage.setItem('username', user);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand>Checklist System</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/add-category">Add Category</Nav.Link>
            <Nav.Link as={Link} to="/completed">Completed Checklists</Nav.Link>
          </Nav>
          <Navbar.Text>User: {username || 'Guest'}</Navbar.Text>
        </Container>
      </Navbar>
      <Container className="mt-4">
        <Routes>
          <Route path="/" element={<Home username={username} />} />
          <Route path="/add-category" element={<AddCategory />} />
          <Route path="/add-checklist/:categoryId" element={<AddChecklist />} />
          <Route path="/checklist/:id" element={<ChecklistView username={username} />} />
          <Route path="/completed" element={<CompletedChecklists />} />
        </Routes>
      </Container>
    </ErrorBoundary>
  );
}

function Home({ username }) {
  const [categories, setCategories] = useState([]);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    axios.get(`${API_BASE}/categories`)
      .then(res => setCategories(res.data))
      .catch(err => console.error('Error fetching categories:', err));
  }, [refresh]);

  return (
    <ErrorBoundary>
      <Button onClick={() => setRefresh(r => r + 1)} className="mb-3">Refresh Categories</Button>
      <h2>Select a Category to Start Checklist</h2>
      <ListGroup>
        {categories.map(cat => (
          <ListGroup.Item key={cat.id}>
            {cat.name}
            <Button variant="primary" className="ms-2" as={Link} to={`/add-checklist/${cat.id}`}>Add Checklist</Button>
            <ChecklistSelector categoryId={cat.id} username={username} />
          </ListGroup.Item>
        ))}
      </ListGroup>
    </ErrorBoundary>
  );
}

function ChecklistSelector({ categoryId, username }) {
  const [checklists, setChecklists] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE}/checklists?categoryId=${categoryId}`)
      .then(res => setChecklists(res.data))
      .catch(err => console.error('Error fetching checklists:', err));
  }, [categoryId]);

  return (
    <ListGroup className="mt-2">
      {checklists.map(cl => (
        <ListGroup.Item key={cl.id}>
          {cl.name}
          <Button variant="success" className="ms-2" as={Link} to={`/checklist/${cl.id}`}>Start</Button>
        </ListGroup.Item>
      ))}
    </ListGroup>
  );
}

function AddCategory() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!name) {
      alert('Category name is required.');
      return;
    }
    axios.post(`${API_BASE}/categories`, { name })
      .then(() => {
        alert('Category added!');
        navigate('/');
      })
      .catch(err => console.error('Error adding category:', err));
  };

  return (
    <ErrorBoundary>
      <h2>Add New Category</h2>
      <Form>
        <Form.Group>
          <Form.Label>Name</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)} />
        </Form.Group>
        <Button onClick={handleSubmit} className="mt-2">Save</Button>
      </Form>
    </ErrorBoundary>
  );
}

function AddChecklist() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [items, setItems] = useState([{ id: '', description: '', checked: false, subItems: [] }]);

  const addItem = () => setItems([...items, { id: '', description: '', checked: false, subItems: [] }]);

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!name || items.some(item => !item.id || !item.description)) {
      alert('Please fill in checklist name and all item IDs/descriptions.');
      return;
    }
    axios.post(`${API_BASE}/checklists`, { categoryId: parseInt(categoryId), name, items })
      .then(() => {
        alert('Checklist added!');
        navigate('/');
      })
      .catch(err => console.error('Error adding checklist:', err));
  };

  return (
    <ErrorBoundary>
      <h2>Add New Checklist to Category</h2>
      <Form>
        <Form.Group>
          <Form.Label>Name</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)} />
        </Form.Group>
        <h4>Items</h4>
        {items.map((item, idx) => (
          <Row key={idx} className="mb-2">
            <Col><Form.Control placeholder="ID (e.g., 1.0)" value={item.id} onChange={e => updateItem(idx, 'id', e.target.value)} /></Col>
            <Col><Form.Control placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></Col>
          </Row>
        ))}
        <Button variant="secondary" onClick={addItem}>Add Item</Button>
        <Button onClick={handleSubmit} className="mt-2 ms-2">Save Checklist</Button>
      </Form>
    </ErrorBoundary>
  );
}

function ChecklistView({ username }) {
  const { id } = useParams();
  const [checklist, setChecklist] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/checklists/${id}`)
      .then(res => setChecklist(res.data))
      .catch(err => console.error('Error fetching checklist:', err));
  }, [id]);

  const toggleItem = (itemId) => {
    if (!checklist) return;
    const newItems = checklist.items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const updatedChecklist = { ...checklist, items: newItems };
    setChecklist(updatedChecklist);
    axios.patch(`${API_BASE}/checklists/${id}`, { items: newItems })
      .catch(err => console.error('Error updating checklist:', err));

    const allChecked = newItems.every(item => item.checked);
    setIsComplete(allChecked);
    if (allChecked) {
      const completed = { ...updatedChecklist, completedBy: username, completedDate: new Date().toISOString() };
      axios.post(`${API_BASE}/completedChecklists`, completed)
        .then(() => alert('Checklist completed and saved!'))
        .catch(err => console.error('Error saving completed checklist:', err));
    }
  };

  if (!checklist) return <p>Loading...</p>;

  return (
    <ErrorBoundary>
      <h2>{checklist.name}</h2>
      {isComplete && <Alert variant="success">Checklist Complete!</Alert>}
      <ListGroup>
        {checklist.items.map(item => (
          <ListGroup.Item key={item.id}>
            <Row>
              <Col md={10}>{item.id} - {item.description}</Col>
              <Col md={2}>
                <Form.Check 
                  type="switch"
                  checked={item.checked}
                  onChange={() => toggleItem(item.id)}
                  className={item.checked ? 'text-success' : ''}
                />
              </Col>
            </Row>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </ErrorBoundary>
  );
}

function CompletedChecklists() {
  const [completed, setCompleted] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE}/completedChecklists`)
      .then(res => setCompleted(res.data))
      .catch(err => console.error('Error fetching completed checklists:', err));
  }, []);

  return (
    <ErrorBoundary>
      <h2>Completed Checklists</h2>
      <ListGroup>
        {completed.map(cl => (
          <ListGroup.Item key={cl.id}>
            {cl.name} - Completed by {cl.completedBy} on {new Date(cl.completedDate).toLocaleString()}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </ErrorBoundary>
  );
}

export default App;