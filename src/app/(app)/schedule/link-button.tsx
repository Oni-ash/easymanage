'use client';

import Link from 'next/link';
import { Button, type ButtonProps } from '@mui/material';

type Props = Omit<ButtonProps, 'component' | 'href'> & { href: string };

export default function LinkButton({ href, ...rest }: Props) {
  return <Button component={Link} href={href} {...rest} />;
}