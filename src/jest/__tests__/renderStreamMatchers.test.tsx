/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {EventEmitter} from 'node:events'
import {describe, test, expect} from '@jest/globals'
import {createRenderStream} from '@testing-library/react-render-stream'
import * as React from 'react'
import {
  RenderStreamMatchers,
  toRenderExactlyTimes,
  toRerender,
} from '../renderStreamMatchers.js'
import {getExpectErrorMessage} from '../../__testHelpers__/getCleanedErrorMessage.js'

expect.extend({
  toRerender,
  toRenderExactlyTimes,
})

declare module 'expect' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Matchers<R extends void | Promise<void>, T = unknown>
    extends RenderStreamMatchers<R, T> {}
}

const testEvents = new EventEmitter<{
  rerender: []
}>()

function RerenderingComponent() {
  const [, rerender] = React.useReducer(c => c + 1, 0)
  React.useEffect(() => {
    function cb() {
      const anyThis = globalThis as any as {IS_REACT_ACT_ENVIRONMENT?: boolean}
      const prev = anyThis.IS_REACT_ACT_ENVIRONMENT
      anyThis.IS_REACT_ACT_ENVIRONMENT = false
      rerender()
      anyThis.IS_REACT_ACT_ENVIRONMENT = prev
    }
    testEvents.addListener('rerender', cb)
    return () => {
      testEvents.removeListener('rerender', cb)
    }
  }, [])
  return null
}

describe('toRerender', () => {
  test('basic functionality', async () => {
    const {takeRender, render} = createRenderStream({})

    render(<RerenderingComponent />)
    await expect(takeRender).toRerender()
    await takeRender()

    testEvents.emit('rerender')
    await expect(takeRender).toRerender()
    await takeRender()

    await expect(takeRender).not.toRerender()
  })

  test("errors when it rerenders, but shouldn't", async () => {
    const {takeRender, render} = createRenderStream({})

    render(<RerenderingComponent />)
    await expect(takeRender).toRerender()
    await takeRender()

    testEvents.emit('rerender')
    const error = await getExpectErrorMessage(
      expect(takeRender).not.toRerender(),
    )
    expect(error).toMatchInlineSnapshot(`
expect(received).not.toRerender(expected)

Expected component to not rerender, but it did.
`)
  })

  test("errors when it should rerender, but doesn't", async () => {
    const {takeRender, render} = createRenderStream({})

    render(<RerenderingComponent />)
    await expect(takeRender).toRerender()
    await takeRender()

    const error = await getExpectErrorMessage(expect(takeRender).toRerender())
    expect(error).toMatchInlineSnapshot(`
expect(received).toRerender(expected)

Expected component to rerender, but it did not.
`)
  })
})

describe('toRenderExactlyTimes', () => {
  test('basic functionality', async () => {
    const {takeRender, render} = createRenderStream({})

    render(<RerenderingComponent />)
    testEvents.emit('rerender')

    await expect(takeRender).toRenderExactlyTimes(2)
  })

  test('errors when the count of rerenders is wrong', async () => {
    const {takeRender, render} = createRenderStream({})

    render(<RerenderingComponent />)
    testEvents.emit('rerender')

    const error = await getExpectErrorMessage(
      expect(takeRender).toRenderExactlyTimes(3),
    )
    expect(error).toMatchInlineSnapshot(`
expect(received).toRenderExactlyTimes(expected)

Expected component to render exactly 3 times.
It rendered 2 times.
`)
  })

  test('errors when the count of rerenders is right (inverted)', async () => {
    const {takeRender, render} = createRenderStream({})

    render(<RerenderingComponent />)
    testEvents.emit('rerender')

    const error = await getExpectErrorMessage(
      expect(takeRender).not.toRenderExactlyTimes(2),
    )
    expect(error).toMatchInlineSnapshot(`
expect(received).not.toRenderExactlyTimes(expected)

Expected component to not render exactly 2 times.
It rendered 2 times.
`)
  })
})