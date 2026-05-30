import { useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import api from '../api/axios'
import { useAuthStore } from '../store/authStore'
import type { RegisterPayload, AuthResponse } from '../types/auth'

export default function Register() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    username: '',
    password: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', form)
      setAuth(data.token, data.user)
      navigate('/game')
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data?.error) {
        setError(err.response.data.error)
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <h1 className="mb-1 text-2xl font-bold text-[var(--text)]">Create your account</h1>
        <p className="mb-6 text-sm text-[var(--muted)]">Start training your eyes to stay on screen.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className={inputClass}
          />
          <input
            type="text"
            name="username"
            placeholder="Username (3-20 chars)"
            value={form.username}
            onChange={handleChange}
            required
            className={inputClass}
          />
          <input
            type="password"
            name="password"
            placeholder="Password (min 6 chars)"
            value={form.password}
            onChange={handleChange}
            required
            className={inputClass}
          />

          {error && (
            <p className="rounded-lg border border-[#e0685c66] bg-[#e0685c26] px-3 py-2 text-sm text-[var(--error)]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--bg)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
