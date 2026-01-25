<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLogin = ref(true)
const showPassword = ref(false)

const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  password: ''
})

const valid = ref(false)

const rules = {
  required: v => !!v || 'Required',
  email: v => /.+@.+\..+/.test(v) || 'Invalid email',
  minLength: v => v.length >= 6 || 'Minimum 6 characters'
}

const title = computed(() => isLogin.value ? 'Welcome back' : 'Create account')
const buttonText = computed(() => isLogin.value ? 'Sign in' : 'Sign up')
const switchText = computed(() => isLogin.value ? "Don't have an account?" : 'Already have an account?')
const switchAction = computed(() => isLogin.value ? 'Sign up' : 'Sign in')

async function submit() {
  if (!valid.value) return

  let success
  if (isLogin.value) {
    success = await authStore.login(form.value.email, form.value.password)
  } else {
    success = await authStore.register(
      form.value.firstName,
      form.value.lastName,
      form.value.email,
      form.value.password
    )
  }

  if (success) {
    router.push('/')
  }
}

function toggleMode() {
  isLogin.value = !isLogin.value
  authStore.error = null
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <div class="text-center mb-8">
          <img src="/traq.svg" alt="Traq" width="100" height="100" class="mb-4" />
          <h1 class="text-h4 font-weight-bold text-primary">Traq</h1>
          <p class="text-body-2 text-medium-emphasis">Track your time, own your day</p>
        </div>

        <v-card class="pa-4" elevation="2">
          <v-card-title class="text-h5 text-center pb-0">
            {{ title }}
          </v-card-title>

          <v-card-text>
            <v-form v-model="valid" @submit.prevent="submit">
              <template v-if="!isLogin">
                <v-row>
                  <v-col cols="6">
                    <v-text-field
                      v-model="form.firstName"
                      label="First name"
                      :rules="[rules.required]"
                      prepend-inner-icon="mdi-account"
                    />
                  </v-col>
                  <v-col cols="6">
                    <v-text-field
                      v-model="form.lastName"
                      label="Last name"
                      :rules="[rules.required]"
                    />
                  </v-col>
                </v-row>
              </template>

              <v-text-field
                v-model="form.email"
                label="Email"
                type="email"
                :rules="[rules.required, rules.email]"
                prepend-inner-icon="mdi-email"
              />

              <v-text-field
                v-model="form.password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                :rules="[rules.required, rules.minLength]"
                prepend-inner-icon="mdi-lock"
                :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPassword = !showPassword"
              />

              <v-alert
                v-if="authStore.error"
                type="error"
                variant="tonal"
                class="mb-4"
                density="compact"
              >
                {{ authStore.error }}
              </v-alert>

              <v-btn
                type="submit"
                color="primary"
                size="large"
                block
                :loading="authStore.loading"
                :disabled="!valid"
              >
                {{ buttonText }}
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions class="justify-center">
            <span class="text-body-2 text-medium-emphasis">{{ switchText }}</span>
            <v-btn
              variant="text"
              color="primary"
              size="small"
              @click="toggleMode"
            >
              {{ switchAction }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
