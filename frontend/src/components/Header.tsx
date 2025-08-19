import React from 'react';
import { Trophy, Zap } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <div className="header">
      <div className="container">
        <h1>
          <Trophy size={48} style={{ marginRight: '16px', verticalAlign: 'middle' }} />
          LLM Tournament Widget
        </h1>
        <p>
          <Zap size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Compare and evaluate different prompts to find the best one
        </p>
      </div>
    </div>
  );
};

export default Header;
