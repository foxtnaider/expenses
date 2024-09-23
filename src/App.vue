<!-- App.vue -->
<template>
  <div class="mobile-container">
    <div class="header">
      <!-- <button class="export-btn">Exportar movimientos actuales</button> -->
      <button class="add-expense-btn" @click="showAddExpense = true">Agregar gasto</button>
    </div>

    <div class="tabs">
      <button class="tab active">Últimos Movimientos</button>
      <button class="tab">Transacciones Mensuales</button>
    </div>

    <div class="transactions">
      <div v-for="expense in expenses" :key="expense.id" class="transaction">
        <button @click="deleteExpense(expense.id)" class="eliminar-btn">X</button>
        <div class="transaction-info">
          <p class="title">{{ expense.category }}</p>
          <p class="reference">{{ expense.description }}</p>
          <p class="date">{{ expense.created_at }}</p>
        </div>
        <div class="amount" :class="expense.amount < 0 ? 'negative' : 'positive'">
          $ {{ formatAmount(expense.amount) }}
        </div>
      </div>
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

        <!-- Input para subir imagen -->
        <input type="file" @change="handleFileUpload" accept="image/*">

        <button type="submit">Guardar</button>
        <button type="button" @click="showAddExpense = false">Cancelar</button>
      </form>
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

const uploadedFile = ref(null);  // Para almacenar el archivo seleccionado

const expenses = ref([]);
const newExpense = ref({
  amount: '',
  category: '',
  description: '',
  date: new Date().toISOString().substr(0, 10)
});

const user = ref(null); // Para almacenar el usuario autenticado

const formatAmount = (amount) => {
      return Math.abs(amount).toFixed(2);
    };
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Función para manejar el archivo seleccionado
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    uploadedFile.value = file;  // Guardar el archivo seleccionado
    console.log('Archivo seleccionado:', file);
  }
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
    let receiptUrl = '';
    // Si hay un archivo seleccionado, subir la imagen al storage
    if (uploadedFile.value) {
      const { data, error } = await supabase
        .storage
        .from('receipts')  // Nombre del bucket donde se subirán las imágenes
        .upload(`receipts/03d50899-d3a0-4db1-ad8d-d768924d0919/${Date.now()}_${uploadedFile.value.name}`, uploadedFile.value);
        // .upload(`receipts/${user.value.id}/${Date.now()}_${uploadedFile.value.name}`, uploadedFile.value);
        
      if (error) {
        console.error('Error al subir la imagen:', error.message);
        return;
      }

      // Obtener la URL pública de la imagen subida
      const { publicURL, error: publicUrlError } = supabase
        .storage
        .from('receipts')
        .getPublicUrl(data.path);

      if (publicUrlError) {
        console.error('Error al obtener la URL pública:', publicUrlError.message);
        return;
      }

      receiptUrl = publicURL;  // Guardar la URL de la imagen
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([
        {
          // user_id: user.id,
          user_id: '03d50899-d3a0-4db1-ad8d-d768924d0919',  // Usar el ID del usuario autenticado
          amount: newExpense.value.amount,
          category: newExpense.value.category,
          description: newExpense.value.description,
          date: newExpense.value.date,
          receipt_url: receiptUrl  // Incluir la URL de la imagen
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
const obtainExpenses = async () => {
  // Obtener los gastos desde Supabase
  const { data, error } = await supabase
  .from('expenses')
  .select('*')
  .order('created_at', { ascending: false });  // Ordenar de forma descendente por la columna "date"


  if (error) {
    console.error('Error al obtener los gastos:', error.message);
  } else {
    expenses.value = data;  // Asignar los gastos obtenidos a la lista
    console.log('Gastos obtenidos:', data);
  }
}
const deleteExpense = async (gastoId) => {

  let confirmation = confirm('¿Está seguro de que desea eliminar este gasto?');  
  if (!confirmation) {
    return;
  }
  try {
    const { data, error } = await supabase
      .from('expenses') // Asegúrate que 'gastos' es el nombre correcto de la tabla
      .delete()
      .eq('id', gastoId);

    if (error) throw error;

    console.log('Gasto eliminado:', data);
    // Actualiza tu lista de gastos para que se vea reflejado el cambio en la interfaz
    // Podrías tener una función para refrescar la lista de gastos
    await obtainExpenses();
  } catch (error) {
    console.error('Error eliminando gasto:', error.message);
  }
}
onMounted(async () => {
  // Obtener los gastos desde Supabase
  obtainExpenses();

});
</script>


<style>
/* Container General */
.mobile-container {
  background-color: #1e2a38;
  color: white;
  width: 100%;
  max-width: 340px;
  margin: 0 auto;
  padding: 20px;
  border-radius: 10px;
  font-family: Arial, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

/* Header */
.header {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.export-btn {
  background-color: #2f3d4a;
  color: white;
  padding: 10px 16px;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  width: 90%;
}

.export-btn:hover {
  background-color: #3f5365;
}
.add-expense-btn {
  background-color: #2f3d4a;
  color: white;
  padding: 10px 16px;
  font-size: 14px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  width: 90%;
}

.add-expense-btn:hover {
  background-color: #3f5365;
}

/* Tabs */
.tabs {
  display: flex;
  justify-content: space-around;
  margin-bottom: 10px;
}

.tab {
  background-color: #2f3d4a;
  padding: 10px;
  font-size: 14px;
  border-radius: 8px;
  border: none;
  color: white;
  cursor: pointer;
  width: 50%;
  text-align: center;
}

.tab.active {
  background-color: #3f5365;
  font-weight: bold;
}

.tab:hover {
  background-color: #3f5365;
}

/* Transacciones */
.transactions {
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 10px;
  margin-top: 10px;
  border-top: 1px solid #2f3d4a;
}

.transaction {
  /* margin-top: 5px; */
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* padding: 2px; */
  border-bottom: 1px solid #2f3d4a;
  font-size: 14px;
  height: 80px;
}

.transaction-info {
  flex-grow: 1;
  padding: 5px;
}

.title {
  font-size: 16px;
  margin: 0;
  padding: 0;
}

.date, .reference {
  font-size: 10px;
  padding: 0;
  margin: 0;
  color: #b0b0b0;
}

.amount {
  font-size: 16px;
  font-weight: bold;
  margin-left: 10px;
}

.negative {
  color: #ff5e5e;
}

.positive {
  color: #4caf50;
}

/* Scrollbar para transacciones */
.transactions::-webkit-scrollbar {
  width: 6px;
}

.transactions::-webkit-scrollbar-thumb {
  background-color: #3f5365;
  border-radius: 10px;
}

.transactions::-webkit-scrollbar-track {
  background-color: #2f3d4a;
}
.eliminar-btn {
  background-color: red;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.eliminar-btn:hover {
  background-color: darkred;
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
  background-color: #2f3d4a;
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
</style>