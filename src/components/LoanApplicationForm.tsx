import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Similar to defining a model in Swift/Java
const loanSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  income: z.number().min(0, "Income must be positive"),
  loanAmount: z.number().min(1000, "Minimum loan amount is $100")
}); 

type LoanFormData = z.infer<typeof loanSchema>;

const LoanApplicationForm: React.FC = () => {
  const { 
    register, 
    handleSubmit, 
    formState: { errors } 
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema)
  });

  const onSubmit = (data: LoanFormData) => {
    // Similar to handling form submission in mobile apps
    console.log('Submitted Data:', data);
    // Future: Send data to backend
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto">
      <div>
        <label>Full Name</label>
        <input 
          {...register('fullName')}
          className="border p-2 w-full"
        />
        {errors.fullName && <p>{errors.fullName.message}</p>}
      </div>

      <div>
        <label>Annual Income</label>
        <input 
          type="number"
          {...register('income', { valueAsNumber: true })}
          className="border p-2 w-full"
        />
        {errors.income && <p>{errors.income.message}</p>}
      </div>

      <div>
        <label>Loan Amount</label>
        <input 
          type="number"
          {...register('loanAmount', { valueAsNumber: true })}
          className="border p-2 w-full"
        />
        {errors.loanAmount && <p>{errors.loanAmount.message}</p>}
      </div>

      <button 
        type="submit" 
        className="bg-blue-500 text-white p-2 rounded"
      >
        Submit Application
      </button>
    </form>
  );
};

export default LoanApplicationForm;