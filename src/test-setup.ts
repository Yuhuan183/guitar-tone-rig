import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/** Without this every render stacks up and queries match across tests. */
afterEach(cleanup)
