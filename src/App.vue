<!-- App.vue -->
<template>
  <div class="app-container">
    <h1>Seguimiento de Gastos</h1>
    
    <div v-if="!isLoggedIn" class="auth-buttons">
      <button @click="showLoginModal = true" class="auth-btn">Iniciar Sesión</button>
      <button @click="showRegisterModal = true" class="auth-btn">Registrarse</button>
    </div>

    <div v-else>
      <button @click="logout" class="auth-btn">Cerrar Sesión</button>
      
      <div class="expense-list">
        <h2>Gastos Recientes</h2>
        <ul>
          <li v-for="expense in expenses" :key="expense.id" class="expense-item">
            <div class="expense-details">
              <span class="amount">${{ expense.amount.toFixed(2) }}</span>
              <span class="category">{{ expense.category }}</span>
              <span class="date">{{ formatDate(expense.date) }}</span>
            </div>
            <p class="description">{{ expense.description }}</p>
          </li>
        </ul>
      </div>
      <button @click="showAddExpense = true" class="add-expense-btn">Agregar Gasto</button>
    </div>

    <!-- Modal de Inicio de Sesión -->
    <div v-if="showLoginModal" class="modal">
      <div class="modal-content">
        <h2>Iniciar Sesión</h2>
        <form @submit.prevent="login">
          <input v-model="loginForm.email" type="email" placeholder="Correo Electrónico" required>
          <input v-model="loginForm.password" type="password" placeholder="Contraseña" required>
          <button type="submit">Iniciar Sesión</button>
          <button type="button" @click="showLoginModal = false">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- Modal de Registro -->
    <div v-if="showRegisterModal" class="modal">
      <div class="modal-content">
        <h2>Registrarse</h2>
        <form @submit.prevent="register">
          <input v-model="registerForm.name" type="text" placeholder="Nombre" required>
          <input v-model="registerForm.email" type="email" placeholder="Correo Electrónico" required>
          <input v-model="registerForm.password" type="password" placeholder="Contraseña" required>
          <button type="submit">Registrarse</button>
          <button type="button" @click="showRegisterModal = false">Cancelar</button>
        </form>
      </div>
    </div>

    <!-- Modal de Agregar Gasto -->
    <div v-if="showAddExpense" class="modal">
      <div class="modal-content">
        <h2>Agregar Nuevo Gasto</h2>
        <form @submit.prevent="addExpense">
          <input v-model="newExpense.amount" type="number" step="0.01" placeholder="Monto" required>
          <input v-model="newExpense.category" type="text" placeholder="Categoría" required>
          <input v-model="newExpense.description" type="text" placeholder="Descripción">
          <input v-model="newExpense.date" type="date" required>
          <button type="submit">Guardar</button>
          <button type="button" @click="showAddExpense = false">Cancelar</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { supabase } from './supabaseClient'

const isLoggedIn = ref(true);
const showLoginModal = ref(false);
const showRegisterModal = ref(false);
const showAddExpense = ref(false);

const loginForm = ref({ email: '', password: '' });
const registerForm = ref({ name: '', email: '', password: '' });

const expenses = ref([]);
const newExpense = ref({
  amount: '',
  category: '',
  description: '',
  date: new Date().toISOString().substr(0, 10)
});

const user = ref(null); // Para almacenar el usuario autenticado

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const login = async () => {
  try {
    const { user: loggedInUser, session, error } = await supabase.auth.signInWithPassword({
      email: loginForm.value.email,
      password: loginForm.value.password
    });

    if (error) {
      console.error('Error durante el inicio de sesión:', error.message);
    } else {
      console.log('Inicio de sesión exitoso:', loggedInUser);

      user.value = loggedInUser; // Guardar el usuario autenticado
      isLoggedIn.value = true;
      showLoginModal.value = false;
      loginForm.value = { email: '', password: '' };
    }
  } catch (error) {
    console.error('Error de ejecución:', error);
  }
};

const register = async () => {
  try {
    const { user: registeredUser, error } = await supabase.auth.signUp({
      email: registerForm.value.email,
      password: registerForm.value.password
    });

    if (error) {
      console.error('Error durante el registro:', error.message);
    } else {
      console.log('Se ha registrado correctamente:', registeredUser);

      user.value = registeredUser;
      isLoggedIn.value = true;
      showRegisterModal.value = false;
      registerForm.value = { name: '', email: '', password: '' };
    }
  } catch (error) {
    console.error('Error de ejecución:', error);
  }
};

const logout = async () => {
  await supabase.auth.signOut(); // Cerrar sesión en Supabase
  user.value = null;
  isLoggedIn.value = false;
};

const addExpense = async () => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          // user_id: user.id,
          user_id: '03d50899-d3a0-4db1-ad8d-d768924d0919',  // Usar el ID del usuario autenticado
          amount: newExpense.value.amount,
          category: newExpense.value.category,
          description: newExpense.value.description,
          date: newExpense.value.date
        }
      ])
      .select();  // Usar `.select()` para devolver los datos insertados
        console.log(data);
    if (error) {
      console.error('Error al agregar el gasto:', error.message);
    } else if (data) {
      console.log('Gasto agregado:', data);
      expenses.value.unshift(data[0]); // Agregar el nuevo gasto a la lista
      showAddExpense.value = false;  // Cerrar el modal
    }
  } catch (error) {
    console.error('Error de ejecución:', error);
  }
};

onMounted(async () => {
  // Obtener los gastos desde Supabase
  const { data, error } = await supabase
  .from('expenses')
  .select('*')
  .order('created_at', { ascending: false });  // Ordenar de forma descendente por la columna "date"


  if (error) {
    console.error('Error al obtener los gastos:', error.message);
  } else {
    expenses.value = data;  // Asignar los gastos obtenidos a la lista
  }

  // // Suscripción en tiempo real a la tabla 'expenses'
  // const channel = supabase
  //   .channel('public:expenses')
  //   .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'expenses' }, (payload) => {
  //     console.log('Nuevo gasto insertado:', payload.new);
  //     expenses.value.push(payload.new);  // Actualizar la lista de gastos con el nuevo registro
  //   })
  //   .subscribe();

  // // Verifica si el canal está suscrito correctamente
  // console.log(channel.state);  // Debería mostrar 'SUBSCRIBED' si todo funciona bien
});
</script>


<style>
.app-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1, h2 {
  color: #8d8d8d;
}

.auth-buttons {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.auth-btn {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.expense-list {
  margin-bottom: 20px;
}

.expense-item {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 10px;
  list-style-type: none;
}

.expense-details {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.amount {
  font-weight: bold;
  color: #e74c3c;
}

.category {
  color: #3498db;
}

.date {
  color: #7f8c8d;
}

.description {
  margin: 0;
  color: #34495e;
}

.add-expense-btn {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 80%;
  max-width: 400px;
}

.modal-content form {
  display: flex;
  flex-direction: column;
}

.modal-content input {
  margin-bottom: 10px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.modal-content button {
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.modal-content button[type="submit"] {
  background-color: #2ecc71;
  color: white;
}

.modal-content button[type="button"] {
  background-color: #e74c3c;
  color: white;
}

@media (min-width: 768px) {
  .app-container {
    max-width: 800px;
  }

  .expense-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
  }
}
</style>