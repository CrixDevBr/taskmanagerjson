import { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Container, Navbar, Nav, Button, Form, ListGroup, Row, Col, Alert } from 'react-bootstrap';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_BASE = 'http://localhost:3001';

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error) => {
      setHasError(true);
    };
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  if (hasError) {
    return <Alert variant="danger">Something went wrong. Please refresh the page or try again later.</Alert>;
  }
  return children;
}

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
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
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/categories`)
      .then(res => setCategories(res.data))
      .catch(() => setError('Failed to load categories. Please try again.'));
  }, [refresh]);

  return (
    <ErrorBoundary>
      {error && <Alert variant="danger">{error}</Alert>}
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
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/checklists?categoryId=${categoryId}`)
      .then(res => setChecklists(res.data))
      .catch(() => setError('Failed to load checklists. Please try again.'));
  }, [categoryId]);

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <ListGroup className="mt-2">
        {checklists.map(cl => (
          <ListGroup.Item key={cl.id}>
            {cl.name}
            <Button variant="success" className="ms-2" as={Link} to={`/checklist/${cl.id}`}>Start</Button>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  );
}

function AddCategory() {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
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
      .catch(() => setError('Failed to add category. Please try again.'));
  };

  return (
    <ErrorBoundary>
      {error && <Alert variant="danger">{error}</Alert>}
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
  const [error, setError] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const addItem = () => {
    setItems([...items, { id: '', description: '', checked: false, subItems: [] }]);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const deleteItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((_, index) => `item-${index}` === active.id);
    const newIndex = items.findIndex((_, index) => `item-${index}` === over.id);
    const newItems = [...items];
    const [movedItem] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movedItem);
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
      .catch(() => setError('Failed to add checklist. Please try again.'));
  };

  return (
    <ErrorBoundary>
      {error && <Alert variant="danger">{error}</Alert>}
      <h2>Add New Checklist to Category</h2>
      <Form>
        <Form.Group>
          <Form.Label>Name</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)} />
        </Form.Group>
        <h4>Items</h4>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((_, index) => `item-${index}`)} strategy={verticalListSortingStrategy}>
            {items.map((item, idx) => (
              <SortableItem key={`item-${idx}`} id={`item-${idx}`}>
                {({ dragHandleProps }) => (
                  <Row className="mb-2 align-items-center">
                    <Col xs={1}>
                      <span className="text-muted" {...dragHandleProps}>☰</span>
                    </Col>
                    <Col>
                      <Form.Control
                        placeholder="ID (e.g., 1.0)"
                        value={item.id}
                        onChange={e => updateItem(idx, 'id', e.target.value)}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        placeholder="Description"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                      />
                    </Col>
                    <Col xs={2}>
                      <Button
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(idx);
                        }}
                      >
                        Delete
                      </Button>
                    </Col>
                  </Row>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
        <Button variant="secondary" onClick={addItem}>Add Item</Button>
        <Button onClick={handleSubmit} className="mt-2 ms-2">Save Checklist</Button>
      </Form>
    </ErrorBoundary>
  );
}

function ChecklistView({ username }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    axios.get(`${API_BASE}/checklists/${id}`)
      .then(res => setChecklist(res.data))
      .catch(() => setError('Failed to load checklist. Please try again.'));
  }, [id]);

  const toggleItem = (itemId) => {
    if (!checklist) return;
    const newItems = checklist.items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const updatedChecklist = { ...checklist, items: newItems };
    setChecklist(updatedChecklist);
    axios.patch(`${API_BASE}/checklists/${id}`, { items: newItems })
      .catch(() => setError('Failed to update checklist. Please try again.'));
    const allChecked = newItems.every(item => item.checked);
    setIsComplete(allChecked);
    if (allChecked) {
      const completed = { ...updatedChecklist, completedBy: username, completedDate: new Date().toISOString() };
      axios.post(`${API_BASE}/completedChecklists`, completed)
        .then(() => alert('Checklist completed and saved!'))
        .catch(() => setError('Failed to save completed checklist. Please try again.'));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...checklist.items];
    newItems[index][field] = value;
    setChecklist({ ...checklist, items: newItems });
  };

  const deleteItem = (index) => {
    const newItems = checklist.items.filter((_, i) => i !== index);
    setChecklist({ ...checklist, items: newItems });
    axios.patch(`${API_BASE}/checklists/${id}`, { items: newItems })
      .catch(() => setError('Failed to delete item. Please try again.'));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = checklist.items.findIndex((_, index) => `item-${index}` === active.id);
    const newIndex = checklist.items.findIndex((_, index) => `item-${index}` === over.id);
    const newItems = [...checklist.items];
    const [movedItem] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, movedItem);
    setChecklist({ ...checklist, items: newItems });
    axios.patch(`${API_BASE}/checklists/${id}`, { items: newItems })
      .catch(() => setError('Failed to reorder items. Please try again.'));
  };

  const addItem = () => {
    setChecklist({ 
      ...checklist, 
      items: [...checklist.items, { id: '', description: '', checked: false, subItems: [] }]
    });
  };

  const saveEdits = () => {
    if (checklist.items.some(item => !item.id || !item.description)) {
      alert('Please fill in all item IDs and descriptions.');
      return;
    }
    axios.patch(`${API_BASE}/checklists/${id}`, { items: checklist.items })
      .then(() => {
        alert('Checklist updated!');
        setIsEditing(false);
      })
      .catch(() => setError('Failed to save checklist. Please try again.'));
  };

  if (!checklist) return <p>Loading...</p>;

  return (
    <ErrorBoundary>
      <h2>{checklist.name}</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {isComplete && !isEditing && <Alert variant="success">Checklist Complete!</Alert>}
      <Button
        variant={isEditing ? 'success' : 'primary'}
        onClick={isEditing ? saveEdits : () => setIsEditing(true)}
        className="mb-3"
      >
        {isEditing ? 'Save Edits' : 'Edit Checklist'}
      </Button>
      {isEditing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={checklist.items.map((_, index) => `item-${index}`)} strategy={verticalListSortingStrategy}>
            {checklist.items.map((item, idx) => (
              <SortableItem key={`item-${idx}`} id={`item-${idx}`}>
                {({ dragHandleProps }) => (
                  <Row className="mb-2 align-items-center">
                    <Col xs={1}>
                      <span className="text-muted" {...dragHandleProps}>☰</span>
                    </Col>
                    <Col>
                      <Form.Control
                        placeholder="ID (e.g., 1.0)"
                        value={item.id}
                        onChange={e => updateItem(idx, 'id', e.target.value)}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        placeholder="Description"
                        value={item.description}
                        onChange={e => updateItem(idx, 'description', e.target.value)}
                      />
                    </Col>
                    <Col xs={2}>
                      <Button
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteItem(idx);
                        }}
                      >
                        Delete
                      </Button>
                    </Col>
                  </Row>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
      ) : (
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
      )}
      {isEditing && (
        <Button
          variant="secondary"
          onClick={addItem}
          className="mt-2"
        >
          Add Item
        </Button>
      )}
    </ErrorBoundary>
  );
}

function CompletedChecklists() {
  const [completed, setCompleted] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/completedChecklists`)
      .then(res => setCompleted(res.data))
      .catch(() => setError('Failed to load completed checklists. Please try again.'));
  }, []);

  return (
    <ErrorBoundary>
      {error && <Alert variant="danger">{error}</Alert>}
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