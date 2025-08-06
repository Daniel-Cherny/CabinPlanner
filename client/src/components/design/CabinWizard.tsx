import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ArrowRight, ArrowLeft, Home, DollarSign, Calendar, Users } from "lucide-react";
import type { Template } from "@shared/schema";

interface CabinWizardProps {
  templates: Template[];
  onComplete: (config: any) => void;
  onCancel: () => void;
}

export function CabinWizard({ templates, onComplete, onCancel }: CabinWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    purpose: '',
    budget: '',
    timeline: '',
    skill: '',
    size: '',
    style: '',
    template: null as Template | null,
    name: '',
    customDimensions: { width: '', length: '', height: '' }
  });

  const steps = [
    "What's your goal?",
    "Budget & Timeline", 
    "Your Experience",
    "Choose Your Style",
    "Customize Size"
  ];

  const handleNext = () => {
    if (step < steps.length) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = () => {
    const selectedTemplate = config.template;
    onComplete({
      name: config.name || `${selectedTemplate?.name || 'Custom'} Cabin`,
      templateId: selectedTemplate?.id,
      width: config.customDimensions.width || selectedTemplate?.defaultWidth || '16',
      length: config.customDimensions.length || selectedTemplate?.defaultLength || '20', 
      height: config.customDimensions.height || selectedTemplate?.defaultHeight || '12',
      designData: {
        ...selectedTemplate?.designData,
        purpose: config.purpose,
        budget: config.budget,
        timeline: config.timeline,
        skill: config.skill,
        wizard_completed: true
      }
    });
  };

  return (
    <div className="min-h-screen bg-cabin-cream p-6">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-playfair font-bold cabin-text">
              Let's Build Your Dream Cabin
            </h1>
            <div className="text-sm cabin-text">
              Step {step} of {steps.length}
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mb-2">
            {steps.map((_, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index + 1 <= step ? 'bg-cabin-brown text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 h-1 ${
                    index + 1 < step ? 'bg-cabin-brown' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <h2 className="text-lg font-medium cabin-text">{steps[step - 1]}</h2>
        </div>

        <Card className="min-h-96">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6">
                <p className="text-cabin-text mb-6">
                  What type of cabin project are you planning? This helps us recommend the best approach.
                </p>
                
                <RadioGroup 
                  value={config.purpose} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, purpose: value }))}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="weekend-getaway" id="weekend" />
                      <Label htmlFor="weekend" className="flex-1 cursor-pointer">
                        <div className="font-medium">Weekend Getaway</div>
                        <div className="text-sm text-muted-foreground">Small cabin for relaxation</div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="full-time-living" id="fulltime" />
                      <Label htmlFor="fulltime" className="flex-1 cursor-pointer">
                        <div className="font-medium">Full-Time Living</div>
                        <div className="text-sm text-muted-foreground">Primary residence</div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="off-grid" id="offgrid" />
                      <Label htmlFor="offgrid" className="flex-1 cursor-pointer">
                        <div className="font-medium">Off-Grid Retreat</div>
                        <div className="text-sm text-muted-foreground">Self-sufficient cabin</div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50">
                      <RadioGroupItem value="learning-project" id="learning" />
                      <Label htmlFor="learning" className="flex-1 cursor-pointer">
                        <div className="font-medium">Learning Project</div>
                        <div className="text-sm text-muted-foreground">First build to learn skills</div>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium cabin-text">What's your budget range?</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    This includes materials only (not tools or labor you might hire)
                  </p>
                  
                  <RadioGroup 
                    value={config.budget} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, budget: value }))}
                  >
                    <div className="space-y-3">
                      {[
                        { value: 'under-10k', label: 'Under $10,000', desc: 'Basic shed-style cabin' },
                        { value: '10k-20k', label: '$10,000 - $20,000', desc: 'Standard small cabin' },
                        { value: '20k-40k', label: '$20,000 - $40,000', desc: 'Well-equipped cabin' },
                        { value: 'over-40k', label: 'Over $40,000', desc: 'Premium materials & finishes' }
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">{option.desc}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-base font-medium cabin-text">How long do you want to spend building?</Label>
                  <Select value={config.timeline} onValueChange={(value) => setConfig(prev => ({ ...prev, timeline: value }))}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Choose your timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-month">1 Month (weekends only)</SelectItem>
                      <SelectItem value="3-months">3 Months (part-time)</SelectItem>
                      <SelectItem value="6-months">6 Months (steady progress)</SelectItem>
                      <SelectItem value="1-year">1 Year+ (when I can)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium cabin-text">What's your building experience?</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Be honest - this helps us recommend the right approach and complexity level
                  </p>
                  
                  <RadioGroup 
                    value={config.skill} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, skill: value }))}
                  >
                    <div className="space-y-3">
                      {[
                        { 
                          value: 'beginner', 
                          label: 'Complete Beginner', 
                          desc: 'I watch YouTube but haven\'t built anything major' 
                        },
                        { 
                          value: 'some-diy', 
                          label: 'Some DIY Experience', 
                          desc: 'I\'ve done basic home repairs and small projects' 
                        },
                        { 
                          value: 'experienced', 
                          label: 'Experienced DIYer', 
                          desc: 'I\'ve built sheds, decks, or other structures' 
                        },
                        { 
                          value: 'professional', 
                          label: 'Professional/Trade Experience', 
                          desc: 'I work in construction or have professional training' 
                        }
                      ].map((option) => (
                        <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                            <div className="font-medium">{option.label}</div>
                            <div className="text-sm text-muted-foreground">{option.desc}</div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <p className="text-cabin-text mb-6">
                    Choose a cabin style you like. These are based on popular YouTube builds and proven designs.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-6">
                    {templates.map((template) => (
                      <Card 
                        key={template.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          config.template?.id === template.id ? 'ring-2 ring-cabin-brown' : ''
                        }`}
                        onClick={() => setConfig(prev => ({ ...prev, template }))}
                      >
                        <div 
                          className="h-32 bg-cover bg-center rounded-t-lg"
                          style={{ backgroundImage: `url(${template.imageUrl})` }}
                        />
                        <CardContent className="p-4">
                          <h3 className="font-semibold cabin-text mb-1">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                          
                          <div className="flex items-center justify-between text-xs">
                            <Badge variant="outline" className="cabin-text">
                              {template.defaultWidth}' × {template.defaultLength}'
                            </Badge>
                            <span className="cabin-brown font-medium">
                              ~${Number(template.basePrice).toLocaleString()}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-medium cabin-text">Project Name</Label>
                  <Input 
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={`My ${config.template?.name || 'Cabin'} Project`}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label className="text-base font-medium cabin-text">Customize Dimensions</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Adjust the size if needed. Bigger isn't always better - start smaller if you're learning!
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="width">Width (ft)</Label>
                      <Input 
                        id="width"
                        type="number"
                        value={config.customDimensions.width}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          customDimensions: { ...prev.customDimensions, width: e.target.value }
                        }))}
                        placeholder={config.template?.defaultWidth?.toString() || '16'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="length">Length (ft)</Label>
                      <Input 
                        id="length"
                        type="number"
                        value={config.customDimensions.length}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          customDimensions: { ...prev.customDimensions, length: e.target.value }
                        }))}
                        placeholder={config.template?.defaultLength?.toString() || '20'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="height">Height (ft)</Label>
                      <Input 
                        id="height"
                        type="number"
                        value={config.customDimensions.height}
                        onChange={(e) => setConfig(prev => ({ 
                          ...prev, 
                          customDimensions: { ...prev.customDimensions, height: e.target.value }
                        }))}
                        placeholder={config.template?.defaultHeight?.toString() || '12'}
                      />
                    </div>
                  </div>
                </div>

                {config.template && (
                  <Card className="bg-cabin-cream bg-opacity-50">
                    <CardContent className="p-4">
                      <h4 className="font-medium cabin-text mb-2">Your Cabin Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Style:</span> {config.template.name}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Size:</span> {
                            config.customDimensions.width || config.template.defaultWidth
                          }' × {
                            config.customDimensions.length || config.template.defaultLength
                          }'
                        </div>
                        <div>
                          <span className="text-muted-foreground">Budget:</span> {config.budget}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Timeline:</span> {config.timeline}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <div className="flex space-x-3">
                {step > 1 && (
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
              
              <div>
                {step < steps.length ? (
                  <Button 
                    onClick={handleNext}
                    className="bg-cabin-brown hover:bg-cabin-brown/90 text-white"
                    disabled={
                      (step === 1 && !config.purpose) ||
                      (step === 2 && (!config.budget || !config.timeline)) ||
                      (step === 3 && !config.skill) ||
                      (step === 4 && !config.template)
                    }
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleComplete}
                    className="bg-cabin-green hover:bg-cabin-green/90 text-white"
                  >
                    Start Building Plan
                    <Home className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}