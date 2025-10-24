import { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Container, Navbar, Nav, Button, Form, ListGroup, Row, Col, Alert, Accordion } from 'react-bootstrap';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_BASE = 'http://localhost:3001'; // Atualize para o backend em produção

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
  const [username, setUsername] = useState(Cookies.get('username') || '');

  return (
    <Routes>
      <Route path="/login" element={<Login setUsername={setUsername} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/*" element={username ? <MainApp username={username} setUsername={setUsername} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

// Tela de Cadastro
function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    try {
      await axios.post(`${API_BASE}/users`, { name, email, password });
      setSuccess('Usuário cadastrado com sucesso! Redirecionando para login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError('Erro ao cadastrar. E-mail já existe?');
    }
  };

  return (
    <Container className="mt-5">
      <h2>Cadastrar Usuário</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Nome</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome completo" />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>E-mail</Form.Label>
          <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemplo@dominio.com" />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Senha</Form.Label>
          <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </Form.Group>
        <Button onClick={handleRegister} variant="primary">Cadastrar</Button>
        <Button variant="link" as={Link} to="/login" className="ms-2">Já tem conta? Faça login</Button>
      </Form>
    </Container>
  );
}

// Tela de Login
function Login({ setUsername }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    try {
      const res = await axios.get(`${API_BASE}/users?email=${email}&password=${password}`);
      if (res.data.length > 0) {
        const user = res.data[0];
        setUsername(user.name);
        Cookies.set('username', user.name, { expires: 7 });
        Cookies.set('userId', user.id, { expires: 7 });
        navigate('/');
      } else {
        setError('E-mail ou senha incorretos.');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    }
  };

  return (
    <Container className="mt-5">
      <h2>Login</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form>
        <Form.Group className="mb-3">
          <Form.Label>E-mail</Form.Label>
          <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Senha</Form.Label>
          <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </Form.Group>
        <Button onClick={handleLogin} className="me-2">Entrar</Button>
        <Button variant="link" as={Link} to="/register">Criar conta</Button>
      </Form>
    </Container>
  );
}

function MainApp({ username, setUsername }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setUsername('');
    Cookies.remove('username');
    Cookies.remove('userId');
    navigate('/login');
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand>Checklist System</Navbar.Brand>
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Home</Nav.Link>
            <Nav.Link as={Link} to="/add-category">Adicionar Categoria</Nav.Link>
            <Nav.Link as={Link} to="/completed">Checklists Concluídos</Nav.Link>
          </Nav>
          <Navbar.Text>Bem-vindo, {username}!</Navbar.Text>
          <Button variant="outline-light" className="ms-2" onClick={handleLogout}>Sair</Button>
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
    </>
  );
}

function Home({ username }) {
  const [categories, setCategories] = useState([]);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/categories`)
      .then(res => setCategories(res.data))
      .catch(() => setError('Erro ao carregar categorias.'));
  }, [refresh]);

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <Button onClick={() => setRefresh(r => r + 1)} className="mb-3">Atualizar</Button>
      <h2>Selecione uma Categoria</h2>
      <ListGroup>
        {categories.map(cat => (
          <ListGroup.Item key={cat.id}>
            {cat.name}
            <Button variant="primary" className="ms-2" as={Link} to={`/add-checklist/${cat.id}`}>+ Checklist</Button>
            <ChecklistSelector categoryId={cat.id} />
          </ListGroup.Item>
        ))}
      </ListGroup>
    </>
  );
}

function ChecklistSelector({ categoryId }) {
  const [checklists, setChecklists] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/checklists?categoryId=${categoryId}`)
      .then(res => setChecklists(res.data))
      .catch(() => setError('Erro ao carregar checklists.'));
  }, [categoryId]);

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <ListGroup className="mt-2">
        {checklists.map(cl => (
          <ListGroup.Item key={cl.id}>
            {cl.name}
            <Button variant="success" className="ms-2" as={Link} to={`/checklist/${cl.id}`}>Iniciar</Button>
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
    if (!name) return alert('Nome da categoria é obrigatório.');
    axios.post(`${API_BASE}/categories`, { name })
      .then(() => {
        alert('Categoria adicionada!');
        navigate('/');
      })
      .catch(() => setError('Erro ao adicionar categoria.'));
  };

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <h2>Nova Categoria</h2>
      <Form>
        <Form.Group>
          <Form.Label>Nome</Form.Label>
          <Form.Control value={name} onChange={e => setName(e.target.value)} />
        </Form.Group>
        <Button onClick={handleSubmit} className="mt-2">Salvar</Button>
      </Form>
    </>
  );
}

function AddChecklist() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [items, setItems] = useState([{ id: '', description: '', checked: false }]);
  const [error, setError] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  const addItem = () => setItems([...items, { id: '', description: '', checked: false }]);
  const updateItem = (i, field, value) => {
    const newItems = [...items];
    newItems[i][field] = value;
    setItems(newItems);
  };
  const deleteItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((_, i) => `item-${i}` === active.id);
    const newIdx = items.findIndex((_, i) => `item-${i}` === over.id);
    const newItems = [...items];
    const [moved] = newItems.splice(oldIdx, 1);
    newItems.splice(newIdx, 0, moved);
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!name || items.some(i => !i.id || !i.description)) {
      return alert('Preencha nome e todos os itens.');
    }
    axios.post(`${API_BASE}/checklists`, { categoryId: parseInt(categoryId), name, items })
      .then(() => {
        alert('Checklist criado!');
        navigate('/');
      })
      .catch(() => setError('Erro ao salvar checklist.'));
  };

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <h2>Novo Checklist</h2>
      <Form>
        <Form.Group><Form.Label>Nome</Form.Label><Form.Control value={name} onChange={e => setName(e.target.value)} /></Form.Group>
        <h4>Itens</h4>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
            {items.map((item, idx) => (
              <SortableItem key={`item-${idx}`} id={`item-${idx}`}>
                {({ dragHandleProps }) => (
                  <Row className="mb-2 align-items-center">
                    <Col xs={1}><span className="text-muted" {...dragHandleProps}>Handle</span></Col>
                    <Col><Form.Control placeholder="ID" value={item.id} onChange={e => updateItem(idx, 'id', e.target.value)} /></Col>
                    <Col><Form.Control placeholder="Descrição" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></Col>
                    <Col xs={2}><Button variant="danger" onClick={e => { e.stopPropagation(); deleteItem(idx); }}>Excluir</Button></Col>
                  </Row>
                )}
              </SortableItem>
            ))}
          </SortableContext>
        </DndContext>
        <Button variant="secondary" onClick={addItem}>+ Item</Button>
        <Button onClick={handleSubmit} className="mt-2 ms-2">Salvar</Button>
      </Form>
    </>
  );
}

function ChecklistView({ username }) {
  const { id } = useParams();
  const [checklist, setChecklist] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    axios.get(`${API_BASE}/checklists/${id}`)
      .then(res => setChecklist(res.data))
      .catch(() => setError('Erro ao carregar checklist.'));
  }, [id]);

  const toggleItem = (itemId) => {
    if (!checklist) return;
    const newItems = checklist.items.map(item => 
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    const updated = { ...checklist, items: newItems };
    setChecklist(updated);
    axios.patch(`${API_BASE}/checklists/${id}`, { items: newItems }).catch(() => setError('Erro ao atualizar.'));

    const allChecked = newItems.every(i => i.checked);
    setIsComplete(allChecked);
    if (allChecked) {
      const completed = {
        ...updated,
        completedBy: username,
        userId: Cookies.get('userId'),
        completedDate: new Date().toISOString(),
        compilationDate: new Date().toISOString()
      };
      axios.post(`${API_BASE}/completedChecklists`, completed)
        .then(() => alert('Checklist concluído e salvo!'))
        .catch(() => setError('Erro ao salvar conclusão.'));
    }
  };

  const updateItem = (i, field, value) => {
    const newItems = [...checklist.items];
    newItems[i][field] = value;
    setChecklist({ ...checklist, items: newItems });
  };

  const deleteItem = (i) => {
    const newItems = checklist.items.filter((_, idx) => idx !== i);
    setChecklist({ ...checklist, items: newItems });
    axios.patch(`${API_BASE}/checklists/${id}`, { items: newItems }).catch(() => setError('Erro ao excluir.'));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = checklist.items.findIndex((_, i) => `item-${i}` === active.id);
    const newIdx = checklist.items.findIndex((_, i) => `item-${i}` === over.id);
    const newItems = [...checklist.items];
    const [moved] = newItems.splice(oldIdx, 1);
    newItems.splice(newIdx, 0, moved);
    setChecklist({ ...checklist, items: newItems });
    axios.patch(`${API_BASE}/checklists/${id}`, { items: newItems }).catch(() => setError('Erro ao reordenar.'));
  };

  const addItem = () => {
    setChecklist({ ...checklist, items: [...checklist.items, { id: '', description: '', checked: false }] });
  };

  const saveEdits = () => {
    if (checklist.items.some(i => !i.id || !i.description)) return alert('Preencha todos os itens.');
    axios.patch(`${API_BASE}/checklists/${id}`, { items: checklist.items })
      .then(() => { alert('Checklist atualizado!'); setIsEditing(false); })
      .catch(() => setError('Erro ao salvar edição.'));
  };

  if (!checklist) return <p>Carregando...</p>;

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <h2>{checklist.name}</h2>
      {isComplete && !isEditing && <Alert variant="success">Checklist Concluído!</Alert>}
      <Button variant={isEditing ? 'success' : 'primary'} onClick={isEditing ? saveEdits : () => setIsEditing(true)} className="mb-3">
        {isEditing ? 'Salvar' : 'Editar'}
      </Button>

      {isEditing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={checklist.items.map((_, i) => `item-${i}`)} strategy={verticalListSortingStrategy}>
            {checklist.items.map((item, idx) => (
              <SortableItem key={`item-${idx}`} id={`item-${idx}`}>
                {({ dragHandleProps }) => (
                  <Row className="mb-2 align-items-center">
                    <Col xs={1}><span className="text-muted" {...dragHandleProps}>Handle</span></Col>
                    <Col><Form.Control placeholder="ID" value={item.id} onChange={e => updateItem(idx, 'id', e.target.value)} /></Col>
                    <Col><Form.Control placeholder="Descrição" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} /></Col>
                    <Col xs={2}><Button variant="danger" onClick={e => { e.stopPropagation(); deleteItem(idx); }}>Excluir</Button></Col>
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
                  <Form.Check type="switch" checked={item.checked} onChange={() => toggleItem(item.id)} className={item.checked ? 'text-success' : ''} />
                </Col>
              </Row>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}
      {isEditing && <Button variant="secondary" onClick={addItem} className="mt-2">+ Item</Button>}
    </>
  );
}

function CompletedChecklists() {
  const [completed, setCompleted] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE}/completedChecklists`)
      .then(res => setCompleted(res.data))
      .catch(() => setError('Erro ao carregar concluídos.'));
  }, []);

  return (
    <>
      {error && <Alert variant="danger">{error}</Alert>}
      <h2>Checklists Concluídos</h2>
      <Accordion>
        {completed.map(cl => (
          <Accordion.Item eventKey={cl.id} key={cl.id}>
            <Accordion.Header>
              {cl.name} — Por: {cl.completedBy} em {new Date(cl.completedDate).toLocaleString()}
              <br /><small>Compilado em: {new Date(cl.compilationDate).toLocaleString()}</small>
            </Accordion.Header>
            <Accordion.Body>
              <h5>Passos:</h5>
              <ListGroup>
                {cl.items.map(item => (
                  <ListGroup.Item key={item.id}>
                    {item.id} - {item.description} <strong>({item.checked ? 'Concluído' : 'Pendente'})</strong>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </>
  );
}

export default App;