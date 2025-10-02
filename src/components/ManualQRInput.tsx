import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, Trash2, QrCode } from 'lucide-react';

interface ColumnValuePair {
    id: string;
    column: string;
    value: string;
}

interface ManualQRInputProps {
    onGenerate: (data: Record<string, string>) => void;
}

export function ManualQRInput({ onGenerate }: ManualQRInputProps) {
    const [pairs, setPairs] = useState<ColumnValuePair[]>([
        { id: '1', column: '', value: '' }
    ]);

    const addPair = () => {
        const newPair: ColumnValuePair = {
            id: Date.now().toString(),
            column: '',
            value: ''
        };
        setPairs([...pairs, newPair]);
    };

    const removePair = (id: string) => {
        if (pairs.length > 1) {
            setPairs(pairs.filter(pair => pair.id !== id));
        }
    };

    const updatePair = (id: string, field: 'column' | 'value', newValue: string) => {
        setPairs(pairs.map(pair =>
            pair.id === id ? { ...pair, [field]: newValue } : pair
        ));
    };

    const handleGenerate = () => {
        // Filter out empty pairs
        const validPairs = pairs.filter(pair => pair.column.trim() && pair.value.trim());

        if (validPairs.length === 0) {
            alert('Please enter at least one column-value pair');
            return;
        }

        // Convert to object
        const data: Record<string, string> = {};
        validPairs.forEach(pair => {
            data[pair.column.trim()] = pair.value.trim();
        });

        onGenerate(data);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manual QR Code Creation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {pairs.map((pair, index) => (
                        <div key={pair.id} className="flex gap-3 items-center">
                            <div className="flex-1 space-y-2 w-full">
                                <Label htmlFor={`column-${pair.id}`}>Column Name</Label>
                                <Input
                                    id={`column-${pair.id}`}
                                    placeholder="e.g., Name, Email, Phone"
                                    value={pair.column}
                                    onChange={(e) => updatePair(pair.id, 'column', e.target.value)}
                                />
                            </div>
                            <div className="flex space-y-2 w-full flex-col">
                                <Label htmlFor={`value-${pair.id}`}>Value</Label>
                                <Input
                                    id={`value-${pair.id}`}
                                    placeholder="Enter value"
                                    value={pair.value}
                                    onChange={(e) => updatePair(pair.id, 'value', e.target.value)}
                                />
                            </div>
                            <div className="mt-1">

                            <div className="mt-2">

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removePair(pair.id)}
                                    disabled={pairs.length === 1}
                                    className="shrink-0 mt-2"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={addPair}
                        className="flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Column
                    </Button>

                    <Button
                        onClick={handleGenerate}
                        className="flex items-center gap-2"
                    >
                        <QrCode size={16} />
                        Generate QR Code
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}