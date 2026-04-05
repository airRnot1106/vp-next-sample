import type { ComponentProps, JSX, JSXElementConstructor } from 'react';

function isElement(prop: unknown): prop is JSX.Element {
  if (typeof prop !== 'object' || prop == undefined || !Object.hasOwn(prop, '$$typeof')) {
    return false;
  }
  if (
    'type' in prop &&
    Object.hasOwn(prop, 'type') &&
    (typeof prop.type === 'function' ||
      typeof prop.type === 'string' ||
      typeof prop.type === 'symbol')
  ) {
    return true;
  }
  return false;
}

/**
 *
 * @example
 *
 * ```tsx
 * function Component() {
 *   return <div id="test"><Target className="test-component"/></div>
 * }
 *
 * const el = Component();
 * assert(getProps(el, "div")!.id === "test");
 * assert(getProps(el, Target)!.className === "test-component");
 * ```
 *
 **/
export function getProps<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>,
>(
  element: JSX.Element,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  componentType: Function | string,
): ComponentProps<T> | undefined {
  if (element.type === componentType) {
    return element.props;
  }
  const foundProps = Object.values(element.props).reduce((acc: object[], prop) => {
    if (!isElement(prop)) return acc;
    const hit = getProps(prop, componentType);
    if (!hit) return acc;
    return [...acc, hit];
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return foundProps[0] as any;
}

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  // Test components
  function TestChild({ message }: { message: string }) {
    return <div>{message}</div>;
  }

  function TestParent({ children }: { children: JSX.Element }) {
    return <div>{children}</div>;
  }

  function TestNested({ id, child }: { id: string; child: JSX.Element }) {
    return (
      <div id={id}>
        <span>wrapper</span>
        {child}
      </div>
    );
  }

  describe('isElement', () => {
    it('有効なJSX要素に対してtrueを返す', () => {
      const element = <div />;
      expect(isElement(element)).toBe(true);
    });

    it('オブジェクト以外に対してfalseを返す', () => {
      expect(isElement('string')).toBe(false);
      expect(isElement(123)).toBe(false);
      expect(isElement(null)).toBe(false);
      expect(isElement(undefined)).toBe(false);
    });

    it('$$typeofを持たないオブジェクトに対してfalseを返す', () => {
      expect(isElement({ example: 'example' })).toBe(false);
    });
  });

  describe('getProps', () => {
    it('コンポーネントの型が直接一致する場合にpropsを返す', () => {
      const element = <TestChild message="hello" />;
      const props = getProps(element, TestChild);

      expect(props).toEqual({ message: 'hello' });
    });

    it('タグ名によってHTML要素のpropsを返す', () => {
      const element = <div className="test-class" id="test-id" />;
      const props = getProps(element, 'div');

      expect(props).toEqual({ id: 'test-id', className: 'test-class' });
    });

    it('ネストされたコンポーネントを見つけてそのpropsを返す', () => {
      const element = (
        <TestParent>
          <TestChild message="nested" />
        </TestParent>
      );
      const props = getProps(element, TestChild);

      expect(props).toEqual({ message: 'nested' });
    });

    it('深くネストされたコンポーネントを見つける', () => {
      const element = (
        <TestNested
          child={
            <TestParent>
              <TestChild message="deep" />
            </TestParent>
          }
          id="outer"
        />
      );
      const props = getProps(element, TestChild);

      expect(props).toEqual({ message: 'deep' });
    });

    it('ネストされたHTML要素を見つける', () => {
      const element = (
        <div id="parent">
          <span id="child">content</span>
        </div>
      );
      const props = getProps(element, 'span');

      expect(props).toEqual({ id: 'child', children: 'content' });
    });

    it('コンポーネントが見つからない場合にundefinedを返す', () => {
      const element = <TestParent>{<div />}</TestParent>;
      const props = getProps(element, TestChild);

      expect(props).toBeUndefined();
    });
  });
}
