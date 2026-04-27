import Image from 'next/image';

export default function Home() {
  return (
    <div>
      <main>
        <Image priority alt="Next.js logo" height={20} src="/next.svg" width={100} />
        <div>
          <h1>To get started, edit the page.tsx file.</h1>
          <p>
            Looking for a starting point or more instructions? Head over to{' '}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              rel="noopener noreferrer"
              target="_blank"
            >
              Templates
            </a>{' '}
            or the{' '}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              rel="noopener noreferrer"
              target="_blank"
            >
              Learning
            </a>{' '}
            center.
          </p>
        </div>
        <div>
          <a
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Image alt="Vercel logomark" height={16} src="/vercel.svg" width={16} />
            Deploy Now
          </a>
          <a
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template&utm_campaign=create-next-app"
            rel="noopener noreferrer"
            target="_blank"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
