import { useEffect, useState } from 'react';
import { Droppable, DroppableProps } from '@hello-pangea/dnd';

interface StrictModeDroppableProps extends DroppableProps {
  children: (provided: any, snapshot: any) => React.ReactElement;
}

export const StrictModeDroppable = ({ children, ...props }: StrictModeDroppableProps) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return <Droppable {...props}>{children}</Droppable>;
};